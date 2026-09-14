import { describe, expect, it, vi } from "vitest";
import { buildPhotoEndpoint, buildPhotoPayload, publishPhoto } from "./graph-client";

const INPUT = {
  pageId: "123456",
  accessToken: "page-token",
  message: "Cá hồi tươi về sáng nay!",
  imageUrl: "https://example.supabase.co/storage/v1/social/a.png",
  target: { kind: "now" } as const,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("buildPhotoEndpoint", () => {
  it("targets the page photos edge on v21.0", () => {
    expect(buildPhotoEndpoint("123456")).toBe("https://graph.facebook.com/v21.0/123456/photos");
  });

  it("honours an explicit version", () => {
    expect(buildPhotoEndpoint("123456", "v22.0")).toContain("/v22.0/");
  });
});

describe("buildPhotoPayload", () => {
  it("publishes immediately for the now target", () => {
    const payload = buildPhotoPayload(INPUT);
    expect(payload.get("url")).toBe(INPUT.imageUrl);
    expect(payload.get("message")).toBe(INPUT.message);
    expect(payload.get("access_token")).toBe("page-token");
    expect(payload.get("published")).toBe("true");
    expect(payload.get("scheduled_publish_time")).toBeNull();
  });

  it("sets published=false and a unix timestamp when scheduled", () => {
    const when = new Date("2026-09-12T10:00:00.000Z");
    const payload = buildPhotoPayload({ ...INPUT, target: { kind: "scheduled", at: when } });
    expect(payload.get("published")).toBe("false");
    expect(payload.get("scheduled_publish_time")).toBe(String(Math.floor(when.getTime() / 1000)));
  });

  // The unpublished target is what "đăng thử" rides on: Facebook stores the
  // photo against the Page but never puts it on the timeline. Omitting the
  // timestamp is what separates it from a scheduled post — with one, Facebook
  // would publish it later rather than keeping it hidden.
  it("sets published=false and no timestamp when unpublished", () => {
    const payload = buildPhotoPayload({ ...INPUT, target: { kind: "unpublished" } });
    expect(payload.get("published")).toBe("false");
    expect(payload.get("scheduled_publish_time")).toBeNull();
    expect(payload.get("message")).toBe(INPUT.message);
    expect(payload.get("url")).toBe(INPUT.imageUrl);
  });
});

describe("publishPhoto", () => {
  it("returns post_id when Facebook provides one", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ id: "photo-1", post_id: "123_456" }));
    const result = await publishPhoto(INPUT, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: true, postId: "123_456" });
  });

  it("falls back to id when post_id is absent", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ id: "photo-1" }));
    const result = await publishPhoto(INPUT, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: true, postId: "photo-1" });
  });

  it("POSTs form-encoded data to the photos edge", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ id: "photo-1" }));
    await publishPhoto(INPUT, fetchImpl as unknown as typeof fetch);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://graph.facebook.com/v21.0/123456/photos");
    expect(init.method).toBe("POST");
    expect(String(init.body)).toContain("message=");
  });

  it("surfaces the Graph API error message", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ error: { message: "Invalid OAuth access token", code: 190 } }, 400),
    );
    const result = await publishPhoto(INPUT, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, error: expect.stringContaining("Invalid OAuth") });
  });

  it("reports a transport failure instead of throwing", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    const result = await publishPhoto(INPUT, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, error: expect.stringContaining("network down") });
  });

  it("reports a non-JSON response instead of throwing", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("<html>502</html>", { status: 502 }));
    const result = await publishPhoto(INPUT, fetchImpl as unknown as typeof fetch);
    expect(result.ok).toBe(false);
  });

  it("fails when Facebook returns neither an id nor an error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}));
    const result = await publishPhoto(INPUT, fetchImpl as unknown as typeof fetch);
    expect(result.ok).toBe(false);
  });

  it("reports a null JSON body instead of throwing", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("null", { status: 502, headers: { "content-type": "application/json" } }),
    );
    const result = await publishPhoto(INPUT, fetchImpl as unknown as typeof fetch);
    expect(result.ok).toBe(false);
  });
});
