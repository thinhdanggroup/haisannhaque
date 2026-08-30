export type StorageLikeClient = {
  storage: {
    from(bucket: string): {
      upload(
        path: string,
        body: ArrayBuffer,
        options: { contentType: string; upsert: boolean },
      ): Promise<{ error: { message: string } | null }>;
      getPublicUrl(path: string): { data: { publicUrl: string } };
    };
  };
};

const MEDIA_BUCKET = "media";

function extensionFromContentType(contentType: string | null): string {
  if (contentType?.includes("png")) return ".png";
  if (contentType?.includes("webp")) return ".webp";
  if (contentType?.includes("gif")) return ".gif";
  return ".jpg";
}

export async function downloadAndStoreImage(
  adminClient: StorageLikeClient,
  sourceUrl: string,
  pathPrefix: string,
): Promise<string> {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image from ${sourceUrl}: HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const bytes = await response.arrayBuffer();
  const storagePath = `${pathPrefix}${extensionFromContentType(contentType)}`;

  const { error } = await adminClient.storage.from(MEDIA_BUCKET).upload(storagePath, bytes, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Failed to upload image to ${storagePath}: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = adminClient.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);

  return publicUrl;
}
