export function applyFlashSalePrice(listPrice: number, discountPct: number): number {
  return Math.floor(listPrice * (1 - discountPct / 100));
}

export function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function getRemainingSeconds(endAt: string, now: number): number {
  return Math.max(0, Math.floor((new Date(endAt).getTime() - now) / 1000));
}
