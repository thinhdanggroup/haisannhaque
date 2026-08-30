export type ShopSyncTrigger = "scheduled" | "manual";
export type ShopSyncRunStatus = "running" | "success" | "failed";
export type ShopSyncRunAction = "created" | "updated" | "archived" | "skipped" | "error";

export type ShopSyncSettings = {
  id: string;
  source: string;
  sourceUrl: string;
  enabled: boolean;
  cronExpression: string;
  targetCatalog: boolean;
  targetShopInfo: boolean;
  updatedAt: string;
};

export type ShopSyncRun = {
  id: string;
  settingsId: string;
  status: ShopSyncRunStatus;
  trigger: ShopSyncTrigger;
  itemsCreated: number;
  itemsUpdated: number;
  itemsArchived: number;
  itemsErrored: number;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type ShopSyncRunItem = {
  id: string;
  runId: string;
  externalId: string;
  productId: string | null;
  action: ShopSyncRunAction;
  message: string | null;
};
