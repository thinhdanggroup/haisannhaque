"use client";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-12 text-center">
      <p className="text-slate-600 mb-4">Đã xảy ra lỗi. Vui lòng thử lại.</p>
      <button
        onClick={reset}
        className="text-blue-600 hover:underline font-medium"
      >
        Thử lại
      </button>
    </div>
  );
}
