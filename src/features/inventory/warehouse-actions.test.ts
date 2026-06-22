import { describe, it, expect } from "vitest";
import { createWarehouse, updateWarehouse } from "./warehouse-actions";

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

describe("warehouse actions (validation)", () => {
  it("returns error when name is empty", async () => {
    const fd = makeFormData({ code: "WH01", name: "" });
    const result = await createWarehouse(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("required") });
  });

  it("returns error when code is empty", async () => {
    const fd = makeFormData({ code: "", name: "Main Warehouse" });
    const result = await createWarehouse(null, fd);
    expect(result).toEqual({ error: expect.stringContaining("required") });
  });

  it("returns error when update id is missing", async () => {
    const fd = makeFormData({ id: "not-a-uuid", code: "WH01", name: "Main" });
    const result = await updateWarehouse(null, fd);
    expect(result).toEqual({ error: expect.any(String) });
  });
});
