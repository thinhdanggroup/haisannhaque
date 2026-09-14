"use client";

import { useActionState, useState } from "react";
import type { SocialPostActionState } from "@/src/features/social-posts/admin-actions";

type SocialPostReviewFormProps = {
  postId: string;
  caption: string;
  canPublish: boolean;
  // Distinct from canPublish: this is "already succeeded", not "not yet
  // eligible" — the two reasons the button is disabled need different
  // messages so the admin isn't told to add an image/caption it already has.
  alreadyPublished: boolean;
  // ISO timestamp of the last "đăng thử", or null if never tested.
  testedAt: string | null;
  updateAction: (
    prev: SocialPostActionState,
    formData: FormData,
  ) => Promise<SocialPostActionState>;
  regenerateAction: (
    prev: SocialPostActionState,
    formData: FormData,
  ) => Promise<SocialPostActionState>;
  publishAction: (
    prev: SocialPostActionState,
    formData: FormData,
  ) => Promise<SocialPostActionState>;
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

const TEXTAREA_CLASS =
  "mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </p>
  );
}

export function SocialPostReviewForm({
  postId,
  caption,
  canPublish,
  alreadyPublished,
  testedAt,
  updateAction,
  regenerateAction,
  publishAction,
}: SocialPostReviewFormProps) {
  const [updateState, updateFormAction, isUpdating] = useActionState<
    SocialPostActionState,
    FormData
  >(updateAction, null);
  const [regenerateState, regenerateFormAction, isRegenerating] = useActionState<
    SocialPostActionState,
    FormData
  >(regenerateAction, null);
  const [publishState, publishFormAction, isPublishing] = useActionState<
    SocialPostActionState,
    FormData
  >(publishAction, null);
  const [scheduledPublishTime, setScheduledPublishTime] = useState<string>("");

  function getScheduledPublishTimeValue(): string {
    if (!scheduledPublishTime) return "";
    const d = new Date(scheduledPublishTime);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString();
  }

  return (
    <div className="max-w-2xl space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Nội dung bài đăng</h2>
        <form action={updateFormAction} className="space-y-3">
          <ErrorBanner message={updateState?.error} />
          <input type="hidden" name="postId" value={postId} />
          <textarea
            key={caption}
            name="caption"
            rows={16}
            defaultValue={caption}
            className={TEXTAREA_CLASS}
            aria-label="Nội dung bài đăng"
          />
          <button
            type="submit"
            disabled={isUpdating}
            className="inline-flex min-h-11 items-center rounded-lg border border-teal-700 px-4 text-sm font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-60"
          >
            {isUpdating ? "Đang lưu…" : "Lưu nội dung"}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Sinh lại nội dung</h2>
        <form action={regenerateFormAction} className="space-y-3">
          <ErrorBanner message={regenerateState?.error} />
          <input type="hidden" name="postId" value={postId} />
          <label className="block text-sm" htmlFor="adjustment">
            <span className="font-medium text-slate-700">Yêu cầu điều chỉnh (tuỳ chọn)</span>
            <input
              id="adjustment"
              name="adjustment"
              type="text"
              placeholder="Ví dụ: ngắn hơn, giọng điệu trẻ trung hơn"
              className={INPUT_CLASS}
            />
          </label>
          <p className="text-xs text-slate-500">
            Sinh lại sẽ ghi đè nội dung hiện tại, kể cả phần bạn đã sửa. Mất khoảng 10–60 giây.
          </p>
          <button
            type="submit"
            disabled={isRegenerating}
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {isRegenerating ? "Đang sinh lại…" : "Sinh lại"}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Đăng lên Facebook</h2>
        <form action={publishFormAction} className="space-y-3">
          <ErrorBanner message={publishState?.error} />
          <input type="hidden" name="postId" value={postId} />
          <input type="hidden" name="scheduledPublishTime" value={getScheduledPublishTimeValue()} />
          <label className="block text-sm" htmlFor="scheduledPublishTimeInput">
            <span className="font-medium text-slate-700">Hẹn giờ đăng (để trống = đăng ngay)</span>
            <input
              id="scheduledPublishTimeInput"
              type="datetime-local"
              value={scheduledPublishTime}
              onChange={(e) => setScheduledPublishTime(e.target.value)}
              className={INPUT_CLASS}
            />
          </label>
          <p className="text-xs text-slate-500">
            Thời gian được hiểu theo múi giờ của bạn. Nếu hẹn giờ, thời điểm đăng phải cách hiện tại
            từ 10 phút đến 75 ngày (giới hạn của Facebook).
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              name="mode"
              value="publish"
              disabled={isPublishing || !canPublish || alreadyPublished}
              className="inline-flex min-h-11 items-center rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {isPublishing ? "Đang đăng…" : "Đăng lên Facebook"}
            </button>
            {/* Stays enabled after a real publish: a test never consumes the
                post, so it can be re-run to check the Facebook connection. */}
            <button
              type="submit"
              name="mode"
              value="test"
              disabled={isPublishing || !canPublish}
              className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {isPublishing ? "Đang xử lý…" : "Đăng thử (chỉ admin thấy)"}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Đăng thử gửi bài lên Facebook ở dạng chưa xuất bản: bài không xuất hiện trên trang,
            chỉ admin xem được trong Meta Business Suite → Publishing Tools. Hẹn giờ sẽ bị bỏ qua.
            {testedAt && (
              <> Lần đăng thử gần nhất: {testedAt.slice(0, 16).replace("T", " ")}.</>
            )}
          </p>
          {alreadyPublished ? (
            <p className="text-xs text-slate-500">
              Bài đăng này đã được đăng lên Facebook và không thể đăng lại từ đây.
            </p>
          ) : (
            !canPublish && (
              <p className="text-xs text-slate-500">
                Cần có ảnh và nội dung trước khi đăng lên Facebook.
              </p>
            )
          )}
        </form>
      </section>
    </div>
  );
}
