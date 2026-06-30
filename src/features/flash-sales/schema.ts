import { z } from "zod";

export const flashSaleEventSchema = z
  .object({
    name: z.string().min(1, "Tên không được để trống"),
    discountPct: z.coerce.number().int().min(1, "Tối thiểu 1%").max(99, "Tối đa 99%"),
    startAt: z.string().min(1, "Thời gian bắt đầu là bắt buộc"),
    endAt: z.string().min(1, "Thời gian kết thúc là bắt buộc"),
    isActive: z.coerce.boolean().default(true),
  })
  .refine((data) => data.endAt > data.startAt, {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu",
    path: ["endAt"],
  });

export const flashSaleEventUpdateSchema = flashSaleEventSchema.extend({
  id: z.string().uuid("ID không hợp lệ"),
});

export type FlashSaleEventInput = z.infer<typeof flashSaleEventSchema>;
export type FlashSaleEventUpdateInput = z.infer<typeof flashSaleEventUpdateSchema>;
