import { describe, expect, it } from "vitest";
import { purchaseOrderReceiptSchema, purchaseOrderSchema } from "./schema";

describe("purchaseOrderSchema", () => {
  it("accepts a valid purchase order payload", () => {
    const result = purchaseOrderSchema.safeParse({
      supplierId: "018f0000-0000-4000-8000-000000000001",
      destinationWarehouseId: "018f0000-0000-4000-8000-000000000002",
      expectedAt: "2026-06-08T02:00:00.000Z",
      lines: [
        {
          variantId: "018f0000-0000-4000-8000-000000000003",
          orderedQty: 12.5,
          unitCost: 90000,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects purchase orders without lines", () => {
    const result = purchaseOrderSchema.safeParse({
      supplierId: "018f0000-0000-4000-8000-000000000001",
      destinationWarehouseId: "018f0000-0000-4000-8000-000000000002",
      lines: [],
    });

    expect(result.success).toBe(false);
  });

  it("accepts a valid purchase order receipt payload", () => {
    const result = purchaseOrderReceiptSchema.safeParse({
      notes: "Kho da nhan hang",
      lines: [
        {
          purchaseOrderLineId: "018f0000-0000-4000-8000-000000000004",
          receivedQty: 2,
          lotNo: "LOT-001",
          expiryAt: "2026-06-15T02:00:00.000Z",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects purchase order receipts without lines", () => {
    const result = purchaseOrderReceiptSchema.safeParse({
      lines: [],
    });

    expect(result.success).toBe(false);
  });
});
