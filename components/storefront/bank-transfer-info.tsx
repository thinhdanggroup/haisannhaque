import Image from "next/image";
import type { CmsBrandAsset } from "@/src/features/cms/types";
import { isTextPlaceholderImage } from "./storefront-placeholder-image";

type BankTransferInfoProps = {
  accounts: CmsBrandAsset[];
  /** Order number to use as the transfer description, when known. */
  transferNote?: string;
  compact?: boolean;
};

/**
 * Account details are entered as one line in the admin ("Bank - Number -
 * Holder"), so split on " - " to show each part on its own line.
 */
export function splitAccountDetails(altText: string): string[] {
  return altText
    .replace(/^thanh toán chuyển khoản:\s*/i, "")
    .split(/\s+[-–|]\s+|\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function BankTransferInfo({ accounts, transferNote, compact = false }: BankTransferInfoProps) {
  if (accounts.length === 0) return null;

  return (
    <div className="space-y-3">
      {accounts.map((account) => {
        const hasQr = !isTextPlaceholderImage(account.imageUrl);
        const qrSize = compact ? 96 : 176;

        return (
          <div
            key={account.id}
            className="flex flex-col gap-3 rounded-lg border border-teal-100 bg-[#f7fbfa] p-3 sm:flex-row sm:items-center"
          >
            {hasQr && (
              <a
                href={account.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 self-center rounded-md border border-slate-200 bg-white p-1"
                aria-label="Mở mã QR chuyển khoản"
              >
                <Image
                  src={account.imageUrl}
                  alt={`Mã QR chuyển khoản ${account.altText}`}
                  width={qrSize}
                  height={qrSize}
                  className="h-auto object-contain"
                  style={{ width: qrSize }}
                  unoptimized
                />
              </a>
            )}
            <div className="min-w-0 text-sm text-slate-700">
              {splitAccountDetails(account.altText).map((line, index) => (
                <p key={index} className={index === 0 ? "font-semibold text-slate-950" : "mt-0.5"}>
                  {line}
                </p>
              ))}
              {transferNote && (
                <p className="mt-2 rounded-md bg-white px-2 py-1 text-xs text-slate-600">
                  Nội dung chuyển khoản:{" "}
                  <span className="font-bold text-slate-950">{transferNote}</span>
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
