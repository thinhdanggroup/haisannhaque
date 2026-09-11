"use client";

import { useActionState, useState } from "react";
import type { SocialPostActionState } from "@/src/features/social-posts/admin-actions";

type TemplateOption = { id: string; name: string };

type UploadedImage = { url: string; storagePath: string; localPath: string };

type SocialPostGenerateFormProps = {
  action: (prev: SocialPostActionState, formData: FormData) => Promise<SocialPostActionState>;
  templates: TemplateOption[];
  defaultTemplateId: string | null;
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export function SocialPostGenerateForm({
  action,
  templates,
  defaultTemplateId,
}: SocialPostGenerateFormProps) {
  const [state, formAction, isPending] = useActionState<SocialPostActionState, FormData>(
    action,
    null,
  );
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const body = new FormData();
      body.set("file", file);

      const response = await fetch("/api/admin/social-images", { method: "POST", body });
      let payload: UploadedImage & { error?: string };
      try {
        payload = (await response.json()) as UploadedImage & { error?: string };
      } catch {
        setUploadError("Tải ảnh thất bại");
        setImage(null);
        return;
      }

      if (!response.ok) {
        setUploadError(payload.error ?? "Tải ảnh thất bại");
        setImage(null);
        return;
      }

      setImage({
        url: payload.url,
        storagePath: payload.storagePath,
        localPath: payload.localPath,
      });
    } catch {
      setUploadError("Tải ảnh thất bại");
      setImage(null);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="templateId">
        <span className="font-medium text-slate-700">Mẫu prompt</span>
        <select
          id="templateId"
          name="templateId"
          required
          defaultValue={defaultTemplateId ?? ""}
          className={INPUT_CLASS}
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm" htmlFor="idea">
        <span className="font-medium text-slate-700">Ý tưởng bài đăng</span>
        <textarea
          id="idea"
          name="idea"
          required
          rows={4}
          placeholder="Ví dụ: Cá hồi Na Uy tươi về sáng nay, giảm 20% cho 30 khách đầu tiên"
          className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <div className="space-y-2 text-sm">
        <span className="font-medium text-slate-700">Ảnh sản phẩm</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          required
          disabled={isUploading}
          className="block w-full text-sm"
        />
        {isUploading && <p className="text-xs text-slate-500">Đang tải ảnh lên…</p>}
        {uploadError && <p className="text-xs text-red-700">{uploadError}</p>}
        {image && (
          <div className="space-y-2">
            <p className="text-xs text-teal-700">Đã tải ảnh lên.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt="Ảnh đã tải lên" className="max-h-48 rounded-lg border" />
          </div>
        )}
      </div>

      {image && (
        <>
          <input type="hidden" name="imageUrl" value={image.url} />
          <input type="hidden" name="imageStoragePath" value={image.storagePath} />
          <input type="hidden" name="imageLocalPath" value={image.localPath} />
        </>
      )}

      {/* Unchecked checkboxes are absent from FormData, which the schema reads
          as "attach-only" — so this maps directly onto ImageVisionMode. */}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="visionMode" value="vision" defaultChecked disabled={!image} />
        <span className="font-medium text-slate-700">Cho AI xem ảnh khi viết nội dung</span>
      </label>

      <p className="text-xs text-slate-500">
        Việc sinh nội dung mất khoảng 10–60 giây. Vui lòng không đóng trang trong lúc chờ.
      </p>

      <button
        type="submit"
        disabled={isPending || isUploading}
        className="inline-flex min-h-11 items-center rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {isPending ? "Đang sinh nội dung…" : "Sinh nội dung"}
      </button>
    </form>
  );
}
