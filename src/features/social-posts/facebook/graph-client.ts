export const GRAPH_VERSION = "v21.0";

// The three ways a photo can land on a Page, as a union so they cannot be
// combined: "scheduled" and "unpublished" both send published=false, and what
// separates them is the presence of the timestamp. A flag alongside an
// optional date would let a caller ask for both at once, which Facebook
// resolves by publishing later — the opposite of staying hidden.
export type PublishTarget =
  | { kind: "now" }
  // `at` must already be inside the Graph API's 10-minute-to-75-day window
  // (validated by schema.ts).
  | { kind: "scheduled"; at: Date }
  // Stored against the Page but kept off the timeline; visible to admins in
  // Business Suite → Publishing Tools. Used by the admin's test publish.
  | { kind: "unpublished" };

export type PublishPhotoInput = {
  pageId: string;
  accessToken: string;
  message: string;
  imageUrl: string;
  target: PublishTarget;
};

export type PublishResult = { ok: true; postId: string } | { ok: false; error: string };

export type FacebookConfig = { pageId: string; accessToken: string };

export function buildPhotoEndpoint(pageId: string, version: string = GRAPH_VERSION): string {
  return `https://graph.facebook.com/${version}/${pageId}/photos`;
}

export function buildPhotoPayload(input: PublishPhotoInput): URLSearchParams {
  const payload = new URLSearchParams({
    url: input.imageUrl,
    message: input.message,
    access_token: input.accessToken,
  });

  switch (input.target.kind) {
    case "now":
      payload.set("published", "true");
      break;
    case "scheduled":
      payload.set("published", "false");
      payload.set("scheduled_publish_time", String(Math.floor(input.target.at.getTime() / 1000)));
      break;
    case "unpublished":
      payload.set("published", "false");
      break;
  }

  return payload;
}

type GraphResponse = {
  id?: string;
  post_id?: string;
  error?: { message?: string; code?: number };
};

export async function publishPhoto(
  input: PublishPhotoInput,
  fetchImpl: typeof fetch = fetch,
): Promise<PublishResult> {
  let body: GraphResponse;

  try {
    const response = await fetchImpl(buildPhotoEndpoint(input.pageId), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: buildPhotoPayload(input),
    });
    body = (await response.json()) as GraphResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không gọi được Facebook Graph API";
    return { ok: false, error: `Lỗi khi gọi Facebook: ${message}` };
  }

  if (body?.error?.message) {
    return { ok: false, error: `Facebook từ chối: ${body.error.message}` };
  }

  const postId = body?.post_id ?? body?.id;
  if (!postId) {
    return { ok: false, error: "Facebook không trả về mã bài đăng." };
  }

  return { ok: true, postId };
}

// Server-only: these must never be imported into a Client Component.
export function resolveFacebookConfig(): FacebookConfig | null {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) return null;

  return { pageId, accessToken };
}
