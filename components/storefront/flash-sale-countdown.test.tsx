import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { FlashSaleCountdown } from "./flash-sale-countdown";

// Utility tests via price-utils (as specified in task brief)
import { formatCountdown, getRemainingSeconds } from "@/src/features/flash-sales/price-utils";

describe("countdown display utilities (via price-utils)", () => {
  it("shows correct time for 1h 30m 15s remaining", () => {
    const now = 1_750_000_000_000;
    const endAt = new Date(now + (1 * 3600 + 30 * 60 + 15) * 1000).toISOString();
    const secs = getRemainingSeconds(endAt, now);
    expect(formatCountdown(secs)).toBe("01:30:15");
  });

  it("returns 0 seconds for past timestamps", () => {
    const now = 1_750_000_000_000;
    const endAt = new Date(now - 1).toISOString();
    expect(getRemainingSeconds(endAt, now)).toBe(0);
  });
});

describe("FlashSaleCountdown component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a formatted countdown for a future endAt", () => {
    const now = Date.now();
    // 2 hours from now
    const endAt = new Date(now + 2 * 3600 * 1000).toISOString();
    render(<FlashSaleCountdown endAt={endAt} />);
    // Should show something like 02:00:00 (or just before)
    expect(screen.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeTruthy();
  });

  it("renders 'Đã kết thúc' when endAt is in the past", () => {
    const endAt = new Date(Date.now() - 5000).toISOString();
    render(<FlashSaleCountdown endAt={endAt} />);
    expect(screen.getByText("Đã kết thúc")).toBeTruthy();
  });

  it("renders the optional label above the timer", () => {
    const endAt = new Date(Date.now() + 3600 * 1000).toISOString();
    render(<FlashSaleCountdown endAt={endAt} label="Kết thúc trong" />);
    expect(screen.getByText("Kết thúc trong")).toBeTruthy();
    expect(screen.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeTruthy();
  });

  it("does not render label when endAt is in the past", () => {
    const endAt = new Date(Date.now() - 1000).toISOString();
    render(<FlashSaleCountdown endAt={endAt} label="Kết thúc trong" />);
    expect(screen.getByText("Đã kết thúc")).toBeTruthy();
    expect(screen.queryByText("Kết thúc trong")).toBeNull();
  });

  it("updates the countdown every second", () => {
    const now = Date.now();
    // 10 seconds from now
    const endAt = new Date(now + 10_000).toISOString();
    render(<FlashSaleCountdown endAt={endAt} />);
    expect(screen.getByText("00:00:10")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("00:00:09")).toBeTruthy();
  });

  it("stops the interval and shows 'Đã kết thúc' when countdown reaches 0", () => {
    const now = Date.now();
    // 2 seconds from now
    const endAt = new Date(now + 2_000).toISOString();
    render(<FlashSaleCountdown endAt={endAt} />);
    expect(screen.getByText("00:00:02")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText("Đã kết thúc")).toBeTruthy();

    // Advance more time — no errors, stays at "Đã kết thúc"
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText("Đã kết thúc")).toBeTruthy();
  });

  it("renders without label prop (optional)", () => {
    const endAt = new Date(Date.now() + 3600 * 1000).toISOString();
    render(<FlashSaleCountdown endAt={endAt} />);
    // Should render time without label
    expect(screen.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeTruthy();
  });
});
