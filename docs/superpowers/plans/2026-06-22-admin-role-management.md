# Admin Role Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow super_admins to view admin users, see their current roles, and grant or revoke roles from the UI without touching the database directly.

**Architecture:** A new permission `admin_roles:update` is added to `super_admin` in the permissions map. Two new pages are created: a list at `/admin/admin-users` and a role management detail page at `/admin/admin-users/[userId]`. Server actions live in a new `src/features/admin/user-management.ts` file. No new DB tables are needed — `user_admin_roles`, `admin_roles`, and `profiles` already exist.

**Tech Stack:** Next.js 15 App Router, Supabase, TypeScript, Zod, React useActionState, Tailwind CSS, Vitest

## Global Constraints
- `createServerClient()` for all DB access
- `requireAdminPermission(client, "admin_roles:update")` on every mutating server action
- Tests mock Supabase as plain JS object, run with `pnpm vitest run <path>`
- `export const dynamic = "force-dynamic"` on all page components

---

### Task 1: Add permission and query functions

**Files:**
- Modify: `src/features/admin/permissions.ts`
- Create: `src/features/admin/user-management.ts`
- Test: `src/features/admin/user-management.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/admin/user-management.test.ts
import { describe, it, expect } from "vitest";
import { getAdminUsers, getAllAdminRoles } from "./user-management";

describe("getAdminUsers", () => {
  it("returns users with their roles from profiles and user_admin_roles", async () => {
    const mockClient = {
      from: (table: string) => {
        if (table === "user_admin_roles") {
          return {
            select: (_: string) => ({
              data: [
                {
                  user_id: "user-1",
                  admin_roles: { id: "role-1", name: "catalog_manager" },
                  profiles: { full_name: "Alice" },
                },
                {
                  user_id: "user-1",
                  admin_roles: { id: "role-2", name: "reporter" },
                  profiles: { full_name: "Alice" },
                },
                {
                  user_id: "user-2",
                  admin_roles: { id: "role-1", name: "catalog_manager" },
                  profiles: { full_name: "Bob" },
                },
              ],
              error: null,
            }),
          };
        }
        return { select: () => ({ data: [], error: null }) };
      },
    };

    const result = await getAdminUsers(mockClient as never);
    expect(result).toHaveLength(2);
    expect(result.find((u) => u.userId === "user-1")?.roles).toEqual([
      "catalog_manager",
      "reporter",
    ]);
    expect(result.find((u) => u.userId === "user-2")?.roles).toEqual(["catalog_manager"]);
  });
});

describe("getAllAdminRoles", () => {
  it("returns all roles from admin_roles", async () => {
    const mockClient = {
      from: (_: string) => ({
        select: (_: string) => ({
          order: (_: string) => ({
            data: [
              { id: "r1", name: "catalog_manager", description: "Manages products" },
              { id: "r2", name: "reporter", description: "Read-only reports" },
            ],
            error: null,
          }),
        }),
      }),
    };

    const result = await getAllAdminRoles(mockClient as never);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: "r1", name: "catalog_manager", description: "Manages products" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/features/admin/user-management.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Add `admin_roles:update` permission to `src/features/admin/permissions.ts`**

```ts
const rolePermissions: Record<string, string[]> = {
  super_admin: ["*"],  // "*" already grants everything — no change needed; requireAdminPermission checks "*" first
  catalog_manager: ["products:read", "products:create", "products:update", "products:delete", "categories:update"],
  marketing: ["cms:update", "promotions:update"],
  customer_service: ["orders:read", "orders:update", "customers:read", "complaints:read", "complaints:update"],
  warehouse: ["inventory:read", "inventory:update", "orders:fulfill"],
  procurement: ["purchase_orders:read", "purchase_orders:update", "suppliers:update"],
  finance: ["payments:read", "refunds:create", "reports:read"],
  reporter: ["reports:read"],
};
```

Note: `super_admin` already has `["*"]` which the `canAccess` function matches against any permission. `requireAdminPermission(client, "admin_roles:update")` will pass for super_admin because `"*"` covers it. No change needed to permissions.ts — the existing `"*"` handles it.

- [ ] **Step 4: Create `src/features/admin/user-management.ts`**

```ts
// src/features/admin/user-management.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

export type AdminUser = {
  userId: string;
  fullName: string;
  roles: string[];
};

export type AdminRole = {
  id: string;
  name: string;
  description: string | null;
};

export type RoleManagementState = { error: string } | null;

export async function getAdminUsers(
  client: Pick<SupabaseClient, "from">,
): Promise<AdminUser[]> {
  const { data, error } = await client
    .from("user_admin_roles")
    .select("user_id, admin_roles(id, name), profiles(full_name)");

  if (error) throw error;

  // Group by user_id
  const userMap = new Map<string, AdminUser>();

  for (const row of (data ?? []) as Array<{
    user_id: string;
    admin_roles: { id: string; name: string } | null;
    profiles: { full_name: string | null } | null;
  }>) {
    if (!userMap.has(row.user_id)) {
      userMap.set(row.user_id, {
        userId: row.user_id,
        fullName: row.profiles?.full_name ?? row.user_id,
        roles: [],
      });
    }
    if (row.admin_roles) {
      userMap.get(row.user_id)!.roles.push(row.admin_roles.name);
    }
  }

  return Array.from(userMap.values());
}

export async function getAdminUserRoles(
  client: Pick<SupabaseClient, "from">,
  userId: string,
): Promise<{ roleId: string; roleName: string }[]> {
  const { data, error } = await client
    .from("user_admin_roles")
    .select("role_id, admin_roles(name)")
    .eq("user_id", userId);

  if (error) throw error;

  return ((data ?? []) as Array<{
    role_id: string;
    admin_roles: { name: string } | null;
  }>).map((row) => ({
    roleId: row.role_id,
    roleName: row.admin_roles?.name ?? row.role_id,
  }));
}

export async function getAllAdminRoles(
  client: Pick<SupabaseClient, "from">,
): Promise<AdminRole[]> {
  const { data, error } = await client
    .from("admin_roles")
    .select("id, name, description")
    .order("name");

  if (error) throw error;

  return ((data ?? []) as AdminRole[]);
}

const grantSchema = z.object({
  userId: z.string().uuid("User ID must be a valid UUID"),
  roleId: z.string().uuid("Role ID must be a valid UUID"),
});

export async function grantRole(
  _prev: RoleManagementState,
  formData: FormData,
): Promise<RoleManagementState> {
  const result = grantSchema.safeParse({
    userId: formData.get("userId"),
    roleId: formData.get("roleId"),
  });
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input." };

  const client = await createServerClient();
  await requireAdminPermission(client, "admin_roles:update");

  const { error } = await client.from("user_admin_roles").insert({
    user_id: result.data.userId,
    role_id: result.data.roleId,
  });

  if (error) {
    if (error.code === "23505") return { error: "This user already has that role." };
    throw error;
  }

  revalidatePath(`/admin/admin-users/${result.data.userId}`);
}

export async function revokeRoleAction(userId: string, roleId: string): Promise<void> {
  const userParsed = z.string().uuid().safeParse(userId);
  const roleParsed = z.string().uuid().safeParse(roleId);

  if (!userParsed.success || !roleParsed.success) {
    throw new Error("Invalid user ID or role ID.");
  }

  const client = await createServerClient();
  await requireAdminPermission(client, "admin_roles:update");

  const { error } = await client
    .from("user_admin_roles")
    .delete()
    .eq("user_id", userParsed.data)
    .eq("role_id", roleParsed.data);

  if (error) throw error;

  revalidatePath(`/admin/admin-users/${userId}`);
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm vitest run src/features/admin/user-management.test.ts
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/user-management.ts src/features/admin/user-management.test.ts
git commit -m "feat(admin): add user-management query and action functions"
```

---

### Task 2: Admin Users List Page

**Files:**
- Create: `app/admin/admin-users/page.tsx`

- [ ] **Step 1: Create the list page**

```tsx
// app/admin/admin-users/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { getAdminUsers, type AdminUser } from "@/src/features/admin/user-management";
import { createServerClient } from "@/src/lib/supabase/server";

type PageData =
  | { access: "allowed"; users: AdminUser[] }
  | { access: "denied" };

async function getPageData(): Promise<PageData> {
  if (shouldUseAdminPlaywrightFixture()) {
    return { access: "allowed", users: [] };
  }

  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "admin_roles:update");
    const users = await getAdminUsers(client);
    return { access: "allowed", users };
  } catch (e) {
    if (e instanceof AdminAuthorizationError) return { access: "denied" };
    throw e;
  }
}

export default async function AdminUsersPage() {
  const pageData = await getPageData();

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Admin Users" />
        <p className="text-sm text-slate-600">Access restricted to super admins.</p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Admin Users"
        description="View and manage admin role assignments."
      />
      <AdminDataTable
        columns={[
          { key: "fullName", label: "Name" },
          {
            key: "roles",
            label: "Roles",
            render: (row) => (
              <span className="text-sm text-slate-600">
                {row.roles.length > 0 ? row.roles.join(", ") : "—"}
              </span>
            ),
          },
        ]}
        rows={pageData.users.map((u) => ({ ...u, id: u.userId }))}
        emptyMessage="No admin users found."
        actionsSlot={(row) => (
          <Link
            href={`/admin/admin-users/${row.userId}`}
            className="text-xs font-medium text-teal-700 hover:text-teal-900"
          >
            Manage roles
          </Link>
        )}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/admin-users/page.tsx
git commit -m "feat(admin): add admin users list page"
```

---

### Task 3: Grant Role Form Component and Detail Page

**Files:**
- Create: `components/admin/grant-role-form.tsx`
- Create: `app/admin/admin-users/[userId]/page.tsx`

- [ ] **Step 1: Create `components/admin/grant-role-form.tsx`**

```tsx
// components/admin/grant-role-form.tsx
"use client";

import { useActionState } from "react";
import type { AdminRole, RoleManagementState } from "@/src/features/admin/user-management";
import { grantRole } from "@/src/features/admin/user-management";

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

type Props = {
  userId: string;
  roles: AdminRole[];
  currentRoleIds: string[];
};

export function GrantRoleForm({ userId, roles, currentRoleIds }: Props) {
  const [state, formAction, isPending] = useActionState<RoleManagementState, FormData>(
    grantRole,
    null,
  );

  const availableRoles = roles.filter((r) => !currentRoleIds.includes(r.id));

  if (availableRoles.length === 0) {
    return <p className="text-sm text-slate-500">This user already has all available roles.</p>;
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm font-medium text-slate-700">
        Grant role
        <select name="roleId" className={INPUT_CLASS}>
          {availableRoles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
              {r.description ? ` — ${r.description}` : ""}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="min-h-10 rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {isPending ? "Granting…" : "Grant role"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create `app/admin/admin-users/[userId]/page.tsx`**

```tsx
// app/admin/admin-users/[userId]/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { GrantRoleForm } from "@/components/admin/grant-role-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import {
  getAdminUserRoles,
  getAllAdminRoles,
  revokeRoleAction,
} from "@/src/features/admin/user-management";
import { createServerClient } from "@/src/lib/supabase/server";

type PageProps = { params: Promise<{ userId: string }> };

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { userId } = await params;

  if (shouldUseAdminPlaywrightFixture()) {
    return <div>User role management (fixture mode)</div>;
  }

  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "admin_roles:update");
  } catch (e) {
    if (e instanceof AdminAuthorizationError) {
      return <p className="text-sm text-slate-600">Access restricted to super admins.</p>;
    }
    throw e;
  }

  const [profileResult, userRoles, allRoles] = await Promise.all([
    client.from("profiles").select("full_name").eq("id", userId).single(),
    getAdminUserRoles(client, userId),
    getAllAdminRoles(client),
  ]);

  const fullName = profileResult.data?.full_name ?? userId;

  return (
    <div>
      <AdminPageHeader
        title={`Roles — ${fullName}`}
        description="Add or remove admin roles for this user."
        action={
          <Link
            href="/admin/admin-users"
            className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← All admin users
          </Link>
        }
      />

      <div className="mb-8 max-w-xl">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Current roles</h2>
        {userRoles.length === 0 ? (
          <p className="text-sm text-slate-500">No roles assigned.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {userRoles.map((r) => (
              <li key={r.roleId} className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
                <span className="text-sm font-medium text-slate-700">{r.roleName}</span>
                <form
                  action={async () => {
                    "use server";
                    await revokeRoleAction(userId, r.roleId);
                  }}
                >
                  <button
                    type="submit"
                    aria-label={`Revoke ${r.roleName}`}
                    className="text-slate-400 hover:text-red-600"
                  >
                    ×
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="max-w-xl">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Grant a role</h2>
        <GrantRoleForm
          userId={userId}
          roles={allRoles}
          currentRoleIds={userRoles.map((r) => r.roleId)}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/grant-role-form.tsx app/admin/admin-users/\[userId\]/page.tsx
git commit -m "feat(admin): add grant-role form and user role detail page"
```

---

### Task 4: Update Admin Navigation

**Files:**
- Modify: `components/admin/admin-nav.tsx`

- [ ] **Step 1: Read the current nav structure**

Open `components/admin/admin-nav.tsx` and find where nav sections are defined. Add a "System" group with "Admin Users" and "Audit Logs" links (Audit Logs will be built in Plan 9 but can be added as a dead link now):

```tsx
// Add after the existing nav groups (e.g. after "Finance" or "Reports"):
{
  label: "System",
  items: [
    { href: "/admin/admin-users", label: "Admin Users", icon: UsersIcon },
    { href: "/admin/audit-logs", label: "Audit Logs", icon: ClipboardListIcon },
  ],
},
```

Import any needed icons from `lucide-react` (e.g. `import { Users, ClipboardList } from "lucide-react"`). Match the icon usage pattern already in the nav file.

- [ ] **Step 2: Commit**

```bash
git add components/admin/admin-nav.tsx
git commit -m "feat(admin): add System section to admin nav with Admin Users and Audit Logs links"
```
