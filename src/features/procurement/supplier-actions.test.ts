import { describe, it, expect } from "vitest";

function makeInsertClient(error: null | { code: string; message: string }) {
  return {
    from: () => ({
      insert: async () => ({ error }),
      update: () => ({ eq: async () => ({ error }) }),
      delete: () => ({ eq: async () => ({ error: null }) }),
    }),
  };
}

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

// These imports will fail until the file exists — that's expected
import {
  validateSupplierInput,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "./supplier-actions";

describe("supplier actions (validation layer)", () => {
  it("returns error when name is empty", () => {
    const fd = makeFormData({ name: "" });
    const result = validateSupplierInput(fd);
    expect(!result.success).toBe(true);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("required");
    }
  });

  it("returns valid data when all fields provided", () => {
    const fd = makeFormData({
      name: "Acme",
      contactName: "Bob",
      phone: "0901234567",
      email: "bob@acme.com",
      address: "123 Main",
      taxCode: "TAX123",
      isActive: "true",
    });
    const result = validateSupplierInput(fd);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Acme");
      expect(result.data.isActive).toBe(true);
    }
  });
});
