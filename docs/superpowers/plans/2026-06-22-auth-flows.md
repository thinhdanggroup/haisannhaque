# Auth Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add customer registration (sign-up) and password reset (forgot-password + email-link confirm) flows so new users can create accounts and existing users can recover access.

**Architecture:** Supabase Auth handles credential storage. Three new pages under `/register` and `/reset-password`. Server Actions call `supabase.auth.signUp()`, `supabase.auth.resetPasswordForEmail()`, and `supabase.auth.updateUser()`. The existing `/login` page gets links to both new flows.

**Tech Stack:** Next.js 15 App Router, Supabase SSR client (`@/src/lib/supabase/server`), Server Actions (`"use server"`), `useActionState` for form state, Zod for validation, Tailwind CSS.

## Global Constraints

- All Server Actions must be in files marked `"use server"` at the top.
- Client form components must be in files marked `"use client"`.
- Vietnamese copy for all user-facing labels (consistent with login page).
- After a successful sign-up, redirect to `/account/orders`.
- After requesting a password reset email, stay on the page and show a success message — do **not** redirect (the user needs to check email).
- The password reset confirmation page is reached via the Supabase email link, which appends `?token_hash=...&type=recovery` to the URL. Extract these from `searchParams`.
- Run `npm test` after each task.

---

### Task 1: Registration page

**Files:**
- Create: `src/features/account/register-action.ts`
- Create: `components/storefront/register-form.tsx`
- Create: `app/register/page.tsx`
- Modify: `app/login/page.tsx` (add "Chưa có tài khoản? Đăng ký" link)
- Modify: `components/storefront/login-form.tsx` (add "Quên mật khẩu?" link)

**Interfaces:**
- Produces: `registerAction(_prev, formData)` server action; `RegisterForm` client component

- [ ] **Step 1: Create the registration server action**

```typescript
// src/features/account/register-action.ts
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";

const registerSchema = z
  .object({
    email: z.email("Email không hợp lệ"),
    password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export type RegisterState = { error: string } | null;

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const result = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const client = await createServerClient();
  const { error } = await client.auth.signUp({
    email: result.data.email,
    password: result.data.password,
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "Email này đã được đăng ký. Vui lòng đăng nhập." };
    }
    return { error: "Không thể tạo tài khoản. Vui lòng thử lại." };
  }

  redirect("/account/orders");
}
```

- [ ] **Step 2: Create the register form client component**

```tsx
// components/storefront/register-form.tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type RegisterState } from "@/src/features/account/register-action";

export function RegisterForm() {
  const [state, action, pending] = useActionState<RegisterState, FormData>(
    registerAction,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      {state && "error" in state && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
          Mật khẩu
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
          Xác nhận mật khẩu
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "Đang tạo tài khoản…" : "Đăng ký"}
      </button>
      <p className="text-center text-sm text-slate-500">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-medium text-slate-900 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 3: Create the register page**

```tsx
// app/register/page.tsx
import type { Metadata } from "next";
import { RegisterForm } from "@/components/storefront/register-form";

export const metadata: Metadata = {
  title: "Đăng ký – Hải Sản Nhà Quê",
};

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">Đăng ký</h1>
        <RegisterForm />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Add "Đăng ký" link to login form**

Read `components/storefront/login-form.tsx` first to locate the closing tag, then add the link inside the form after the submit button:

```tsx
// Add at the bottom of the <form> in components/storefront/login-form.tsx,
// after the existing submit button:
<p className="text-center text-sm text-slate-500">
  Chưa có tài khoản?{" "}
  <Link href="/register" className="font-medium text-slate-900 hover:underline">
    Đăng ký
  </Link>
</p>
```

Also add `import Link from "next/link";` at the top if not already present.

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: PASS — all existing tests pass (no unit-testable pure logic in register action)

- [ ] **Step 6: Commit**

```bash
git add src/features/account/register-action.ts components/storefront/register-form.tsx app/register/page.tsx components/storefront/login-form.tsx
git commit -m "feat(auth): add customer registration page and form"
```

---

### Task 2: Forgot password page

**Files:**
- Create: `src/features/account/reset-password-action.ts`
- Create: `components/storefront/forgot-password-form.tsx`
- Create: `app/reset-password/page.tsx`
- Modify: `components/storefront/login-form.tsx` (add "Quên mật khẩu?" link)

**Interfaces:**
- Produces: `requestPasswordResetAction(_prev, formData)` server action; `ForgotPasswordForm` client component

- [ ] **Step 1: Create the password reset request server action**

```typescript
// src/features/account/reset-password-action.ts
"use server";

import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";
import { headers } from "next/headers";

const emailSchema = z.object({
  email: z.email("Email không hợp lệ"),
});

export type ResetPasswordRequestState = { error: string } | { success: true } | null;

export async function requestPasswordResetAction(
  _prev: ResetPasswordRequestState,
  formData: FormData,
): Promise<ResetPasswordRequestState> {
  const result = emailSchema.safeParse({ email: formData.get("email") });

  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const headersList = await headers();
  const origin = headersList.get("origin") ?? "";
  const redirectTo = `${origin}/reset-password/confirm`;

  const client = await createServerClient();
  const { error } = await client.auth.resetPasswordForEmail(result.data.email, {
    redirectTo,
  });

  if (error) {
    return { error: "Không thể gửi email. Vui lòng thử lại." };
  }

  return { success: true };
}
```

- [ ] **Step 2: Create the forgot password form client component**

```tsx
// components/storefront/forgot-password-form.tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestPasswordResetAction,
  type ResetPasswordRequestState,
} from "@/src/features/account/reset-password-action";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<ResetPasswordRequestState, FormData>(
    requestPasswordResetAction,
    null,
  );

  if (state && "success" in state) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-green-700 bg-green-50 rounded-md px-4 py-3">
          Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư.
        </p>
        <Link href="/login" className="text-sm text-slate-600 hover:underline">
          Quay lại đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state && "error" in state && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      <p className="text-sm text-slate-500">
        Nhập email của bạn và chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
      </p>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "Đang gửi…" : "Gửi email đặt lại mật khẩu"}
      </button>
      <p className="text-center text-sm text-slate-500">
        <Link href="/login" className="font-medium text-slate-900 hover:underline">
          Quay lại đăng nhập
        </Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 3: Create the forgot password page**

```tsx
// app/reset-password/page.tsx
import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/storefront/forgot-password-form";

export const metadata: Metadata = {
  title: "Quên mật khẩu – Hải Sản Nhà Quê",
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">Quên mật khẩu</h1>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Add "Quên mật khẩu?" link to login form**

In `components/storefront/login-form.tsx`, add the link after the password input and before the submit button:

```tsx
// Add after the password <div> and before the submit button:
<div className="flex justify-end">
  <Link href="/reset-password" className="text-xs text-slate-500 hover:text-slate-700 hover:underline">
    Quên mật khẩu?
  </Link>
</div>
```

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/account/reset-password-action.ts components/storefront/forgot-password-form.tsx app/reset-password/page.tsx components/storefront/login-form.tsx
git commit -m "feat(auth): add forgot password page and reset request action"
```

---

### Task 3: Password reset confirmation page

**Files:**
- Create: `src/features/account/update-password-action.ts`
- Create: `components/storefront/reset-password-form.tsx`
- Create: `app/reset-password/confirm/page.tsx`

**Interfaces:**
- Consumes: `token_hash` and `type` from URL searchParams (provided by Supabase email link)
- Produces: `updatePasswordAction(_prev, formData)` server action; `ResetPasswordForm` client component

**Note:** The Supabase email link calls `verifyOtp({ token_hash, type: 'recovery' })` before allowing password update. This must happen server-side in the page component before rendering the form.

- [ ] **Step 1: Create the update password server action**

```typescript
// src/features/account/update-password-action.ts
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";

const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export type UpdatePasswordState = { error: string } | null;

export async function updatePasswordAction(
  _prev: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const result = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const client = await createServerClient();
  const { error } = await client.auth.updateUser({ password: result.data.password });

  if (error) {
    return { error: "Không thể cập nhật mật khẩu. Liên kết có thể đã hết hạn." };
  }

  redirect("/login");
}
```

- [ ] **Step 2: Create the reset password form client component**

```tsx
// components/storefront/reset-password-form.tsx
"use client";

import { useActionState } from "react";
import {
  updatePasswordAction,
  type UpdatePasswordState,
} from "@/src/features/account/update-password-action";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<UpdatePasswordState, FormData>(
    updatePasswordAction,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      {state && "error" in state && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
          Mật khẩu mới
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
          Xác nhận mật khẩu mới
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "Đang cập nhật…" : "Đặt mật khẩu mới"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create the password reset confirmation page**

```tsx
// app/reset-password/confirm/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/src/lib/supabase/server";
import { ResetPasswordForm } from "@/components/storefront/reset-password-form";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu – Hải Sản Nhà Quê",
};

type PageProps = {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
};

export default async function ResetPasswordConfirmPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { token_hash, type } = params;

  if (!token_hash || type !== "recovery") {
    redirect("/reset-password");
  }

  const client = await createServerClient();
  const { error } = await client.auth.verifyOtp({ token_hash, type: "recovery" });

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <p className="text-sm text-red-600">
            Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">Đặt lại mật khẩu</h1>
        <ResetPasswordForm />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run the full test suite**

```bash
npm test
```

Expected: PASS — all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/features/account/update-password-action.ts components/storefront/reset-password-form.tsx app/reset-password/confirm/page.tsx
git commit -m "feat(auth): add password reset confirmation page"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Registration page with email/password/confirm + validation
- ✅ "Đăng ký" link added to login form
- ✅ Forgot password page — sends reset email via Supabase
- ✅ "Quên mật khẩu?" link added to login form
- ✅ Password reset confirmation page — verifies OTP token, shows update form
- ✅ Redirect to `/login` after successful password update

**Not in scope (intentional):**
- Email verification flow — Supabase handles this automatically when email confirmation is enabled in the project settings. No code change needed.
- OAuth / social login — not requested.
