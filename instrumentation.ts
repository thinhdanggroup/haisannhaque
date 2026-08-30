export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startShopSyncScheduler } = await import("./src/features/shop-sync/scheduler");
    await startShopSyncScheduler();
  }
}
