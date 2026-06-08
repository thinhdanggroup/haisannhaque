import { z } from "zod";

export const purchaseOrderLineSchema = z.object({
  variantId: z.string().uuid(),
  orderedQty: z.number().positive(),
  unitCost: z.number().nonnegative(),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),
  destinationWarehouseId: z.string().uuid(),
  expectedAt: z.string().datetime().optional(),
  lines: z.array(purchaseOrderLineSchema).min(1),
});

export const purchaseOrderReceiptLineSchema = z.object({
  purchaseOrderLineId: z.string().uuid(),
  receivedQty: z.number().positive(),
  lotNo: z.string().min(1).optional(),
  expiryAt: z.string().datetime().optional(),
});

export const purchaseOrderReceiptSchema = z.object({
  notes: z.string().optional(),
  lines: z.array(purchaseOrderReceiptLineSchema).min(1),
});

export type PurchaseOrderLineInput = z.infer<typeof purchaseOrderLineSchema>;
export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;
export type PurchaseOrderReceiptLineInput = z.infer<typeof purchaseOrderReceiptLineSchema>;
export type PurchaseOrderReceiptInput = z.infer<typeof purchaseOrderReceiptSchema>;
