"use client";

import { useActionState, useRef } from "react";
import { importProducts, type ImportResult } from "@/src/features/catalog/import-actions";

const CSV_HEADERS = [
  "name",
  "status",
  "temperature_class",
  "origin",
  "short_description",
  "description",
  "sku",
  "unit",
  "list_price",
  "sale_price",
].join(",");

export function ProductImportForm() {
  const [state, action, isPending] = useActionState<ImportResult, FormData>(
    importProducts,
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!inputRef.current?.files?.[0]) return;
    const fd = new FormData();
    fd.set("file", inputRef.current.files[0]);
    action(fd);
  }

  const hasResult = state !== null;
  const hasErrors = hasResult && state.errors.length > 0;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
        <p className="font-medium">Định dạng file CSV</p>
        <p>Mỗi hàng là một sản phẩm kèm một biến thể đầu tiên. Hàng tiêu đề bắt buộc:</p>
        <code className="block rounded bg-slate-100 px-3 py-2 text-xs text-slate-600 overflow-x-auto whitespace-nowrap">
          {CSV_HEADERS}
        </code>
        <a
          href="/product-import-template.csv"
          download
          className="text-teal-700 underline text-xs hover:text-teal-800"
        >
          Tải xuống file mẫu
        </a>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm" htmlFor="import-file">
          <span className="font-medium text-slate-700">Chọn file CSV</span>
          <input
            id="import-file"
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            required
            className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-teal-700 hover:file:bg-teal-100"
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {isPending ? "Đang nhập…" : "Nhập sản phẩm"}
        </button>
      </form>

      {hasResult && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">
            Kết quả:{" "}
            <span className="text-teal-700">
              {state.imported} sản phẩm được nhập thành công
            </span>
            {hasErrors && (
              <span className="ml-2 text-red-600">· {state.errors.length} lỗi</span>
            )}
          </p>

          {hasErrors && (
            <div className="overflow-x-auto rounded-lg border border-red-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-red-200 bg-red-50">
                    <th className="px-4 py-2 text-left font-medium text-red-800">Hàng</th>
                    <th className="px-4 py-2 text-left font-medium text-red-800">Lỗi</th>
                  </tr>
                </thead>
                <tbody>
                  {state.errors.map((err) => (
                    <tr key={err.row} className="border-b border-red-100 last:border-0">
                      <td className="px-4 py-2 text-red-700 tabular-nums">{err.row}</td>
                      <td className="px-4 py-2 text-red-700">{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
