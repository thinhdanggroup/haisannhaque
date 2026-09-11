"use client";

type SocialPostDeleteFormProps = {
  action: (formData: FormData) => Promise<void>;
  fieldName: string;
  id: string;
  confirmMessage: string;
};

// A server page can't pass an inline onSubmit, so this mirrors
// components/admin/cms-row-actions.tsx: a tiny client wrapper around the
// delete form that blocks the irreversible submit behind a confirm().
export function SocialPostDeleteForm({
  action,
  fieldName,
  id,
  confirmMessage,
}: SocialPostDeleteFormProps) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <input type="hidden" name={fieldName} value={id} />
      <button type="submit" className="text-sm font-medium text-red-700">
        Xoá
      </button>
    </form>
  );
}
