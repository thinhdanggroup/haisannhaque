import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, buildImagePaths, validateImageFile } from "./image-store";

describe("validateImageFile", () => {
  it("accepts a JPEG under the size cap", () => {
    expect(validateImageFile({ type: "image/jpeg", size: 1024 })).toBeNull();
  });

  it("accepts PNG, WebP and GIF", () => {
    for (const type of ["image/png", "image/webp", "image/gif"]) {
      expect(validateImageFile({ type, size: 1024 })).toBeNull();
    }
  });

  it("rejects a disallowed MIME type", () => {
    expect(validateImageFile({ type: "application/pdf", size: 1024 })).toMatch(/JPEG/);
  });

  it("rejects a file over the size cap", () => {
    expect(validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES + 1 })).toMatch(/5 MB/);
  });

  it("accepts a file exactly at the size cap", () => {
    expect(validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES })).toBeNull();
  });
});

describe("buildImagePaths", () => {
  it("puts the storage object under the social/ prefix", () => {
    const { storagePath } = buildImagePaths("photo.png", "/var/lib/social-posts");
    expect(storagePath).toMatch(/^social\/[0-9a-f-]{36}\.png$/);
  });

  it("returns an absolute local path inside the image dir", () => {
    const { localPath } = buildImagePaths("photo.png", "/var/lib/social-posts");
    expect(localPath.startsWith("/var/lib/social-posts/")).toBe(true);
    expect(localPath.endsWith(".png")).toBe(true);
  });

  it("uses the same basename for both destinations", () => {
    const { storagePath, localPath } = buildImagePaths("photo.webp", "/tmp/images");
    expect(localPath.split("/").pop()).toBe(storagePath.split("/").pop());
  });

  it("falls back to .jpg when the filename has no extension", () => {
    const { storagePath } = buildImagePaths("photo", "/tmp/images");
    expect(storagePath.endsWith(".jpg")).toBe(true);
  });

  it("ignores a directory-traversal filename and keeps only the extension", () => {
    // The client controls file.name, so it must never reach a path unsanitised.
    const { localPath, storagePath } = buildImagePaths("../../etc/passwd.png", "/tmp/images");
    expect(localPath).not.toContain("..");
    expect(storagePath).not.toContain("..");
    expect(storagePath.endsWith(".png")).toBe(true);
  });
});
