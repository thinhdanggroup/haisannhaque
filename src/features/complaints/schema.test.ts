import { describe, expect, it } from "vitest";
import { complaintCaseSchema } from "./schema";

describe("complaintCaseSchema", () => {
  it("accepts a valid complaint case payload", () => {
    const result = complaintCaseSchema.safeParse({
      orderId: "018f0000-0000-4000-8000-000000000001",
      customerId: "018f0000-0000-4000-8000-000000000002",
      reason: "San pham bi hu hong khi giao",
      resolution: "Hoan tien mot phan",
    });

    expect(result.success).toBe(true);
  });

  it("rejects short complaint reasons", () => {
    const result = complaintCaseSchema.safeParse({
      reason: "x",
    });

    expect(result.success).toBe(false);
  });
});
