import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/src/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import {
  createCmsPage,
  deleteCmsPage,
  createCmsNavItem,
  deleteCmsNavItem,
} from "./admin-actions";

function makeAdminChain() {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [{ admin_roles: { name: "super_admin" } }],
        error: null,
      }),
    }),
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  };
}

describe("createCmsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });
    mockInsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue(makeAdminChain());
  });

  it("returns error when pageKey is empty", async () => {
    const fd = new FormData();
    fd.set("pageKey", "");
    fd.set("title", "Home");
    fd.set("status", "published");
    const result = await createCmsPage(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("required") });
  });

  it("returns error when pageKey contains uppercase", async () => {
    const fd = new FormData();
    fd.set("pageKey", "Home-Page");
    fd.set("title", "Home");
    fd.set("status", "published");
    const result = await createCmsPage(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("lowercase") });
  });

  it("inserts and redirects on valid input", async () => {
    const { redirect } = await import("next/navigation");
    const fd = new FormData();
    fd.set("pageKey", "home");
    fd.set("title", "Home");
    fd.set("status", "published");
    await createCmsPage(null, fd).catch(() => {});
    expect(mockFrom).toHaveBeenCalledWith("cms_pages");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ page_key: "home", title: "Home", status: "published" }),
    );
    expect(redirect).toHaveBeenCalledWith("/admin/content");
  });
});

describe("deleteCmsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });
    const deleteChain = { eq: vi.fn().mockResolvedValue({ error: null }) };
    mockDelete.mockReturnValue(deleteChain);
    mockFrom.mockReturnValue({ ...makeAdminChain(), delete: mockDelete });
  });

  it("throws for an empty page key", async () => {
    await expect(deleteCmsPage("")).rejects.toThrow("Invalid page key.");
  });

  it("deletes by page_key for a valid key", async () => {
    await deleteCmsPage("home");
    expect(mockFrom).toHaveBeenCalledWith("cms_pages");
    expect(mockDelete).toHaveBeenCalled();
  });
});

describe("createCmsNavItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });
    mockInsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue(makeAdminChain());
  });

  it("returns error when label is empty", async () => {
    const fd = new FormData();
    fd.set("placement", "header");
    fd.set("label", "");
    fd.set("href", "/");
    fd.set("iconKey", "");
    fd.set("sortOrder", "0");
    fd.set("isActive", "true");
    const result = await createCmsNavItem(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("Label") });
  });

  it("inserts on valid input", async () => {
    const { redirect } = await import("next/navigation");
    const fd = new FormData();
    fd.set("placement", "header");
    fd.set("label", "Home");
    fd.set("href", "/");
    fd.set("iconKey", "");
    fd.set("sortOrder", "10");
    fd.set("isActive", "true");
    await createCmsNavItem(null, fd).catch(() => {});
    expect(mockFrom).toHaveBeenCalledWith("cms_navigation_items");
    expect(redirect).toHaveBeenCalledWith("/admin/content");
  });
});

describe("deleteCmsNavItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockRpc.mockResolvedValue({ data: [{ open_order_count: 0 }], error: null });
    const deleteChain = { eq: vi.fn().mockResolvedValue({ error: null }) };
    mockDelete.mockReturnValue(deleteChain);
    mockFrom.mockReturnValue({ ...makeAdminChain(), delete: mockDelete });
  });

  it("throws for a non-UUID id", async () => {
    await expect(deleteCmsNavItem("not-a-uuid")).rejects.toThrow("Invalid nav item id.");
  });

  it("deletes by id for a valid UUID", async () => {
    await deleteCmsNavItem("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    expect(mockFrom).toHaveBeenCalledWith("cms_navigation_items");
  });
});
