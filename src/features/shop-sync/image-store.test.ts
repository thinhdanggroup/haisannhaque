import { describe, expect, it, vi, beforeEach } from "vitest";
import { downloadAndStoreImage } from "./image-store";

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockFrom = vi.fn(() => ({ upload: mockUpload, getPublicUrl: mockGetPublicUrl }));

const fakeAdminClient = { storage: { from: mockFrom } } as never;

describe("downloadAndStoreImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://project.supabase.co/storage/v1/object/public/media/shop-sync/abc.jpg" },
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "image/jpeg"]]),
      arrayBuffer: async () => new ArrayBuffer(8),
    }) as never;
  });

  it("downloads the source image and uploads it under the given prefix", async () => {
    const url = await downloadAndStoreImage(
      fakeAdminClient,
      "https://mms.img.susercontent.com/some-id@resize_ss240x240.jpg",
      "shop-sync/products/prod-1",
    );

    expect(mockFrom).toHaveBeenCalledWith("media");
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^shop-sync\/products\/prod-1/),
      expect.any(ArrayBuffer),
      expect.objectContaining({ contentType: "image/jpeg", upsert: true }),
    );
    expect(url).toBe("https://project.supabase.co/storage/v1/object/public/media/shop-sync/abc.jpg");
  });

  it("throws when the source fetch fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 }) as never;
    await expect(
      downloadAndStoreImage(fakeAdminClient, "https://example.com/missing.jpg", "shop-sync/products/prod-1"),
    ).rejects.toThrow(/404/);
  });

  it("throws when the storage upload fails", async () => {
    mockUpload.mockResolvedValue({ error: { message: "bucket full" } });
    await expect(
      downloadAndStoreImage(fakeAdminClient, "https://example.com/ok.jpg", "shop-sync/products/prod-1"),
    ).rejects.toThrow(/bucket full/);
  });
});
