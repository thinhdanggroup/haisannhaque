import { describe, expect, it } from "vitest";
import { canTransitionOrder } from "./status";

describe("canTransitionOrder", () => {
  it("allows pending confirmation to confirmed", () => {
    expect(canTransitionOrder("pending_confirmation", "confirmed")).toBe(true);
  });

  it("blocks completed to picking", () => {
    expect(canTransitionOrder("completed", "picking")).toBe(false);
  });
});
