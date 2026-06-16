"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type ProductUploadFormProps = {
  productId: string;
};

export function ProductUploadForm({ productId }: ProductUploadFormProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("productId", productId);

      const res = await fetch("/api/admin/images", { method: "POST", body });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Upload failed");
        return;
      }

      // Reset file input
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tải lên hình ảnh</p>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <label className="block text-sm" htmlFor="upload-file">
        <span className="font-medium text-slate-700">Chọn file</span>
        <input
          id="upload-file"
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          required
          className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-teal-700 hover:file:bg-teal-100"
        />
      </label>

      <button
        type="submit"
        disabled={isUploading}
        className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {isUploading ? "Đang tải lên…" : "Tải lên"}
      </button>
    </form>
  );
}
