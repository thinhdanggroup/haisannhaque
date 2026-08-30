import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock is hoisted above plain top-level const declarations. Once a file
// has any vi.hoisted() block (needed below to work around a sibling-module
// hoisting bug in this repo's vitest version — see the comment further
// down), plain top-level consts referenced from other vi.mock factories can
// also trip a TDZ "Cannot access before initialization" error. Using
// vi.hoisted() for every mock referenced by a factory sidesteps this
// consistently.
const { mockSchedule } = vi.hoisted(() => ({ mockSchedule: vi.fn() }));
vi.mock("node-cron", () => ({ default: { schedule: mockSchedule }, schedule: mockSchedule }));

// vi.mock is hoisted above plain top-level const declarations. Referencing a
// sibling-module mock (e.g. "./queries" or "./sync-service", which live in
// this same directory) from a plain top-level const trips a hoisting bug in
// this repo's vitest version (TDZ "Cannot access before initialization"),
// even though the same pattern works fine for mocks outside this directory
// (e.g. "@/src/lib/supabase/admin" below). vi.hoisted() sidesteps it by
// running before the mock factories are registered. See
// src/features/shop-sync/admin-actions.test.ts for the same workaround.
const { mockGetShopSyncSettings, mockRunSync } = vi.hoisted(() => ({
  mockGetShopSyncSettings: vi.fn(),
  mockRunSync: vi.fn(),
}));
vi.mock("./queries", () => ({ getShopSyncSettings: mockGetShopSyncSettings }));
vi.mock("./sync-service", () => ({ runSync: mockRunSync }));

vi.mock("@/src/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({})) }));

import { startShopSyncScheduler } from "./scheduler";

describe("startShopSyncScheduler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not schedule anything when no settings exist", async () => {
    mockGetShopSyncSettings.mockResolvedValue(null);
    await startShopSyncScheduler();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it("does not schedule anything when sync is disabled", async () => {
    mockGetShopSyncSettings.mockResolvedValue({ id: "s1", enabled: false, cronExpression: "0 3 * * *" });
    await startShopSyncScheduler();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it("schedules the job on the configured cron expression when enabled", async () => {
    mockGetShopSyncSettings.mockResolvedValue({ id: "s1", enabled: true, cronExpression: "0 3 * * *" });
    await startShopSyncScheduler();
    expect(mockSchedule).toHaveBeenCalledWith("0 3 * * *", expect.any(Function), {
      timezone: "Asia/Ho_Chi_Minh",
    });
  });

  it("does not throw when the stored cron expression is invalid", async () => {
    mockGetShopSyncSettings.mockResolvedValue({ id: "s1", enabled: true, cronExpression: "not a cron" });
    mockSchedule.mockImplementationOnce(() => {
      throw new Error("Invalid cron expression: not a cron");
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(startShopSyncScheduler()).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it("swallows and logs an error thrown inside the scheduled callback", async () => {
    mockGetShopSyncSettings.mockResolvedValue({ id: "s1", enabled: true, cronExpression: "* * * * *" });
    mockRunSync.mockRejectedValue(new Error("supabase unreachable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await startShopSyncScheduler();
    const scheduledFn = mockSchedule.mock.calls[0][1] as () => Promise<void>;

    await expect(scheduledFn()).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith(
      "[shop-sync] scheduled run failed:",
      expect.any(Error),
    );

    consoleError.mockRestore();
  });

  it("does not throw or reject and does not schedule a job when the startup settings fetch fails", async () => {
    mockGetShopSyncSettings.mockRejectedValue(new Error("network error: getaddrinfo ENOTFOUND"));

    await expect(startShopSyncScheduler()).resolves.toBeUndefined();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it("skips a run if the previous scheduled run is still in flight", async () => {
    mockGetShopSyncSettings.mockResolvedValue({ id: "s1", enabled: true, cronExpression: "* * * * *" });
    // Bind resolveFirstRun to the actual promise runSync will return, up
    // front, before mockRunSync's implementation is even wired in. runSync
    // is only reached one microtask after the synchronous portion of this
    // test runs (the cron callback re-fetches settings via an awaited
    // getShopSyncSettings call before invoking runSync), so resolving a
    // promise created and captured this early is what makes the test's
    // own timing irrelevant — resolving a promise before anything awaits
    // it is safe in JS; the resolution is simply remembered.
    let resolveFirstRun!: (value: unknown) => void;
    const firstRunPromise = new Promise((resolve) => {
      resolveFirstRun = resolve;
    });
    mockRunSync.mockImplementation(() => firstRunPromise);

    await startShopSyncScheduler();
    const scheduledFn = mockSchedule.mock.calls[0][1] as () => Promise<void>;

    const firstCall = scheduledFn();
    const secondCall = scheduledFn(); // fires while first is still running
    resolveFirstRun({ id: "run-1" });
    await Promise.all([firstCall, secondCall]);

    expect(mockRunSync).toHaveBeenCalledTimes(1);
  });
});
