import { describe, it, expect } from "vitest";
import { flashSaleEventSchema, flashSaleEventUpdateSchema } from "./schema";

const validPayload = {
  name: "Cuối tuần giảm 20%",
  discountPct: "20",
  startAt: "2026-07-01T00:00:00+07:00",
  endAt: "2026-07-02T00:00:00+07:00",
  isActive: "true",
};

describe("flashSaleEventSchema", () => {
  it("accepts a valid payload", () => {
    expect(flashSaleEventSchema.safeParse(validPayload).success).toBe(true);
  });

  it("rejects discountPct = 0", () => {
    expect(flashSaleEventSchema.safeParse({ ...validPayload, discountPct: "0" }).success).toBe(false);
  });

  it("rejects discountPct = 100", () => {
    expect(flashSaleEventSchema.safeParse({ ...validPayload, discountPct: "100" }).success).toBe(false);
  });

  it("rejects end_at before start_at", () => {
    expect(
      flashSaleEventSchema.safeParse({
        ...validPayload,
        startAt: "2026-07-02T00:00:00+07:00",
        endAt: "2026-07-01T00:00:00+07:00",
      }).success,
    ).toBe(false);
  });

  it("rejects empty name", () => {
    expect(flashSaleEventSchema.safeParse({ ...validPayload, name: "" }).success).toBe(false);
  });
});

describe("flashSaleEventUpdateSchema", () => {
  it("requires a valid uuid id", () => {
    expect(
      flashSaleEventUpdateSchema.safeParse({ ...validPayload, id: "not-a-uuid" }).success,
    ).toBe(false);
  });

  it("accepts valid update payload", () => {
    expect(
      flashSaleEventUpdateSchema.safeParse({
        ...validPayload,
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      }).success,
    ).toBe(true);
  });
});
