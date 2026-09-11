import { extname } from "node:path";

// Same rules as app/api/admin/images/route.ts.
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const DEFAULT_IMAGE_DIR = "/tmp/social-post-images";

export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Chỉ cho phép ảnh JPEG, PNG, WebP hoặc GIF";
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return "Ảnh phải nhỏ hơn 5 MB";
  }

  return null;
}

// The image directory must sit inside the agy read_file allow-rule and be
// writable by the Next.js process.
export function resolveImageDir(): string {
  return process.env.SOCIAL_POST_IMAGE_DIR ?? DEFAULT_IMAGE_DIR;
}

export function buildImagePaths(
  fileName: string,
  imageDir: string,
): { storagePath: string; localPath: string } {
  // Only the extension is taken from the client-supplied name; the basename
  // is a fresh UUID, so a traversal attempt like "../../x.png" cannot escape.
  const ext = extname(fileName) || ".jpg";
  const basename = `${crypto.randomUUID()}${ext}`;

  return {
    storagePath: `social/${basename}`,
    localPath: `${imageDir}/${basename}`,
  };
}
