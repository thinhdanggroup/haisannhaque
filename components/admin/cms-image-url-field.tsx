"use client";

import { useRef, useState } from "react";

type CmsImageUrlFieldProps = {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
  inputClassName: string;
};

/**
 * A URL input with an upload button beside it. Uploading stores the file in
 * Supabase Storage and writes its public URL into the input, so the form
 * still submits a plain URL either way.
 */
export function CmsImageUrlField({
  name,
  label,
  required,
  defaultValue,
  inputClassName,
}: CmsImageUrlFieldProps) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/cms-images", { method: "POST", body });
      const result = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !result.url) {
        setError(result.error ?? "Tải ảnh lên thất bại");
        return;
      }

      setUrl(result.url);
    } catch {
      setError("Tải ảnh lên thất bại");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="text-sm">
      <label htmlFor={name} className="font-medium text-slate-700">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={name}
          name={name}
          type="url"
          required={required}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className={inputClassName}
        />
        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="mt-1 min-h-11 shrink-0 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          {isUploading ? "Đang tải…" : "Tải ảnh lên"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="mt-2 max-h-40 rounded-lg border border-slate-200 object-contain" />
      )}
    </div>
  );
}
