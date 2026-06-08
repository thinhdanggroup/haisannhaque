import { z } from "zod";

export const complaintCaseSchema = z.object({
  orderId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  reason: z.string().min(3),
  resolution: z.string().optional(),
});

export type ComplaintCaseInput = z.infer<typeof complaintCaseSchema>;
