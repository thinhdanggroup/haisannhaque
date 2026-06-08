import { describe, expect, it, vi } from "vitest";
import { requireAdminPermission } from "./auth";

function createClientMock(roles: string[]) {
  const eq = vi.fn().mockResolvedValue({
    data: roles.map((name) => ({ admin_roles: { name } })),
    error: null,
  });
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "018f0000-0000-4000-8000-000000000001" } },
        error: null,
      }),
    },
    from,
  };
}

describe("requireAdminPermission", () => {
  it("returns admin context when the user has permission", async () => {
    const context = await requireAdminPermission(createClientMock(["finance"]), "refunds:create");

    expect(context.userId).toBe("018f0000-0000-4000-8000-000000000001");
    expect(context.roles).toEqual(["finance"]);
  });

  it("throws a 403 error when the user lacks permission", async () => {
    await expect(
      requireAdminPermission(createClientMock(["catalog_manager"]), "refunds:create"),
    ).rejects.toMatchObject({
      status: 403,
    });
  });
});
