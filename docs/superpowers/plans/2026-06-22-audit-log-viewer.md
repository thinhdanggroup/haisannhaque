# Audit Log Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only audit log viewer for super_admins and a reusable write utility so server actions can start recording what was changed and by whom.

**Architecture:** A `writeAuditLog` utility in `src/features/admin/audit.ts` silently writes to the `audit_logs` table and can be called from any server action. A separate `src/features/admin/audit-log.ts` module handles querying with filtering and cursor-based pagination. The viewer page at `/admin/audit-logs` shows a filterable, paginated table — no editing, no deletion. The `audit_logs` table already exists in the DB schema.

**Tech Stack:** Next.js 15 App Router, Supabase, TypeScript, Zod, React, Tailwind CSS, Vitest

## Global Constraints
- `createServerClient()` for all DB access in server actions and pages
- `requireAdminPermission(client, "audit_logs:read")` on the viewer page — super_admin's `"*"` covers this automatically
- Tests mock Supabase as plain JS object, run with `pnpm vitest run <path>`
- `export const dynamic = "force-dynamic"` on all page components
- `writeAuditLog` must never throw — failures are silently swallowed

---

### Task 1: Audit Log Write Utility

**Files:**
- Create: `src/features/admin/audit.ts`
- Test: `src/features/admin/audit.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/admin/audit.test.ts
import { describe, it, expect, vi } from "vitest";
import { writeAuditLog } from "./audit";

describe("writeAuditLog", () => {
  it("calls insert with correct fields", async () => {
    const insertedRows: unknown[] = [];
    const mockClient = {
      from: (table: string) => ({
        insert: async (row: unknown) => {
          if (table === "audit_logs") insertedRows.push(row);
          return { error: null };
        },
      }),
    };

    await writeAuditLog(mockClient as never, {
      actorId: "user-1",
      action: "update",
      tableName: "products",
      recordId: "prod-1",
      oldValues: { name: "Old Name" },
      newValues: { name: "New Name" },
    });

    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0]).toMatchObject({
      actor_id: "user-1",
      action: "update",
      table_name: "products",
      record_id: "prod-1",
      old_values: { name: "Old Name" },
      new_values: { name: "New Name" },
    });
  });

  it("does not throw when DB returns an error", async () => {
    const mockClient = {
      from: (_: string) => ({
        insert: async (_: unknown) => ({ error: new Error("DB error") }),
      }),
    };

    // Should resolve without throwing
    await expect(
      writeAuditLog(mockClient as never, { action: "delete", tableName: "products" }),
    ).resolves.toBeUndefined();
  });

  it("works with minimal opts (action only)", async () => {
    const insertedRows: unknown[] = [];
    const mockClient = {
      from: (_: string) => ({
        insert: async (row: unknown) => {
          insertedRows.push(row);
          return { error: null };
        },
      }),
    };

    await writeAuditLog(mockClient as never, { action: "login" });

    expect(insertedRows[0]).toMatchObject({ action: "login" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/features/admin/audit.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Create `src/features/admin/audit.ts`**

```ts
// src/features/admin/audit.ts
import type { SupabaseClient } from "@supabase/supabase-js";

type WriteAuditLogOpts = {
  actorId?: string;
  action: string;
  tableName?: string;
  recordId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
};

export async function writeAuditLog(
  client: Pick<SupabaseClient, "from">,
  opts: WriteAuditLogOpts,
): Promise<void> {
  try {
    await client.from("audit_logs").insert({
      actor_id: opts.actorId ?? null,
      action: opts.action,
      table_name: opts.tableName ?? null,
      record_id: opts.recordId ?? null,
      old_values: opts.oldValues ?? null,
      new_values: opts.newValues ?? null,
    });
  } catch {
    // Audit logging must never break the calling action.
  }
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run src/features/admin/audit.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/admin/audit.ts src/features/admin/audit.test.ts
git commit -m "feat(admin): add writeAuditLog utility"
```

---

### Task 2: Audit Log Query Function

**Files:**
- Create: `src/features/admin/audit-log.ts`
- Test: `src/features/admin/audit-log.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/admin/audit-log.test.ts
import { describe, it, expect } from "vitest";
import { getAuditLogs } from "./audit-log";

describe("getAuditLogs", () => {
  it("queries audit_logs with default limit of 50", async () => {
    const calls: { method: string; args: unknown[] }[] = [];

    const mockClient = {
      from: (table: string) => {
        calls.push({ method: "from", args: [table] });
        return {
          select: (cols: string) => {
            calls.push({ method: "select", args: [cols] });
            return {
              order: (col: string, opts: object) => {
                calls.push({ method: "order", args: [col, opts] });
                return {
                  limit: (n: number) => {
                    calls.push({ method: "limit", args: [n] });
                    return {
                      data: [
                        {
                          id: "log-1",
                          actor_id: "user-1",
                          action: "update",
                          table_name: "products",
                          record_id: "prod-1",
                          created_at: "2026-06-22T10:00:00Z",
                        },
                      ],
                      error: null,
                    };
                  },
                };
              },
            };
          },
        };
      },
    };

    const result = await getAuditLogs(mockClient as never, {});

    expect(calls.find((c) => c.method === "limit")?.args[0]).toBe(50);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "log-1",
      actorId: "user-1",
      action: "update",
      tableName: "products",
      recordId: "prod-1",
      createdAt: "2026-06-22T10:00:00Z",
    });
  });

  it("filters by tableName when provided", async () => {
    const eqCalls: { col: string; val: string }[] = [];

    const mockClient = {
      from: (_: string) => ({
        select: (_: string) => ({
          order: (_: string, _opts: object) => ({
            eq: (col: string, val: string) => {
              eqCalls.push({ col, val });
              return {
                limit: (_: number) => ({ data: [], error: null }),
              };
            },
          }),
        }),
      }),
    };

    await getAuditLogs(mockClient as never, { tableName: "products" });
    expect(eqCalls).toContainEqual({ col: "table_name", val: "products" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/features/admin/audit-log.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Create `src/features/admin/audit-log.ts`**

```ts
// src/features/admin/audit-log.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditLogEntry = {
  id: string;
  actorId: string | null;
  action: string;
  tableName: string | null;
  recordId: string | null;
  createdAt: string;
};

export type AuditLogFilters = {
  tableName?: string;
  actorId?: string;
  after?: string;  // cursor: last seen id for pagination
};

export async function getAuditLogs(
  client: Pick<SupabaseClient, "from">,
  filters: AuditLogFilters,
  limit = 50,
): Promise<AuditLogEntry[]> {
  let query = client
    .from("audit_logs")
    .select("id, actor_id, action, table_name, record_id, created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (filters.tableName) {
    query = (query as unknown as { eq: (c: string, v: string) => typeof query }).eq(
      "table_name",
      filters.tableName,
    ) as typeof query;
  }
  if (filters.actorId) {
    query = (query as unknown as { eq: (c: string, v: string) => typeof query }).eq(
      "actor_id",
      filters.actorId,
    ) as typeof query;
  }
  if (filters.after) {
    query = (
      query as unknown as { lt: (c: string, v: string) => typeof query }
    ).lt("id", filters.after) as typeof query;
  }

  const { data, error } = await (
    query as unknown as { limit: (n: number) => Promise<{ data: unknown[]; error: unknown }> }
  ).limit(limit);

  if (error) throw error;

  return ((data ?? []) as Array<{
    id: string;
    actor_id: string | null;
    action: string;
    table_name: string | null;
    record_id: string | null;
    created_at: string;
  }>).map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    action: row.action,
    tableName: row.table_name,
    recordId: row.record_id,
    createdAt: row.created_at,
  }));
}
```

Note: The chained `.eq()` / `.lt()` calls on the Supabase query builder work through method chaining — the type casts above handle the TypeScript overloads. If the project uses a typed Supabase client generated with `supabase gen types`, you may be able to remove the casts and rely on the generated types instead.

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run src/features/admin/audit-log.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/admin/audit-log.ts src/features/admin/audit-log.test.ts
git commit -m "feat(admin): add audit log query function with filtering and pagination"
```

---

### Task 3: Audit Log Viewer Page

**Files:**
- Create: `app/admin/audit-logs/page.tsx`

- [ ] **Step 1: Create the viewer page**

```tsx
// app/admin/audit-logs/page.tsx
export const dynamic = "force-dynamic";

import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { shouldUseAdminPlaywrightFixture } from "@/src/features/admin/dashboard";
import { getAuditLogs, type AuditLogEntry } from "@/src/features/admin/audit-log";
import { createServerClient } from "@/src/lib/supabase/server";
import Link from "next/link";

type PageProps = {
  searchParams: Promise<{ table?: string; after?: string }>;
};

type PageData =
  | { access: "allowed"; entries: AuditLogEntry[]; tableFilter: string; lastId: string | null }
  | { access: "denied" };

async function getPageData(searchParams: { table?: string; after?: string }): Promise<PageData> {
  if (shouldUseAdminPlaywrightFixture()) {
    return { access: "allowed", entries: [], tableFilter: "", lastId: null };
  }

  try {
    const client = await createServerClient();
    await requireAdminPermission(client, "audit_logs:read");

    const tableFilter = searchParams.table ?? "";
    const entries = await getAuditLogs(
      client,
      {
        tableName: tableFilter || undefined,
        after: searchParams.after || undefined,
      },
      50,
    );

    const lastId = entries.length === 50 ? entries[entries.length - 1].id : null;

    return { access: "allowed", entries, tableFilter, lastId };
  } catch (e) {
    if (e instanceof AdminAuthorizationError) return { access: "denied" };
    throw e;
  }
}

export default async function AuditLogsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const pageData = await getPageData(params);

  if (pageData.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Audit Logs" />
        <p className="text-sm text-slate-600">Access restricted to super admins.</p>
      </div>
    );
  }

  const { entries, tableFilter, lastId } = pageData;

  const nextParams = new URLSearchParams();
  if (tableFilter) nextParams.set("table", tableFilter);
  if (lastId) nextParams.set("after", lastId);

  const prevParams = new URLSearchParams();
  if (tableFilter) prevParams.set("table", tableFilter);

  return (
    <div>
      <AdminPageHeader
        title="Audit Logs"
        description="Read-only record of changes made by admin users."
      />

      {/* Filter bar */}
      <form method="GET" className="mb-6 flex items-end gap-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Filter by table</span>
          <input
            name="table"
            defaultValue={tableFilter}
            placeholder="e.g. products"
            className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
        </label>
        <button
          type="submit"
          className="min-h-10 rounded-lg bg-slate-100 px-4 text-sm font-medium text-slate-700 hover:bg-slate-200"
        >
          Filter
        </button>
        {tableFilter && (
          <Link
            href="/admin/audit-logs"
            className="min-h-10 flex items-center text-sm text-slate-500 hover:text-slate-700"
          >
            Clear
          </Link>
        )}
      </form>

      <AdminDataTable
        columns={[
          { key: "action", label: "Action" },
          { key: "tableName", label: "Table" },
          {
            key: "recordId",
            label: "Record ID",
            render: (row) => (
              <span className="font-mono text-xs text-slate-500">{row.recordId ?? "—"}</span>
            ),
          },
          {
            key: "actorId",
            label: "Actor",
            render: (row) => (
              <span className="font-mono text-xs text-slate-500">{row.actorId ?? "—"}</span>
            ),
          },
          {
            key: "createdAt",
            label: "When",
            render: (row) => (
              <span className="text-xs text-slate-500">
                {new Date(row.createdAt).toLocaleString()}
              </span>
            ),
          },
        ]}
        rows={entries.map((e) => ({ ...e, id: e.id }))}
        emptyMessage="No audit log entries found."
      />

      {/* Pagination */}
      <div className="mt-6 flex gap-3">
        {params.after && (
          <Link
            href={`/admin/audit-logs?${prevParams}`}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Newer
          </Link>
        )}
        {lastId && (
          <Link
            href={`/admin/audit-logs?${nextParams}`}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Older →
          </Link>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/audit-logs/page.tsx
git commit -m "feat(admin): add audit log viewer page with filter and pagination"
```

---

### Task 4: Wire writeAuditLog into Key Server Actions

**Files:**
- Modify: `src/features/cms/admin-actions.ts` (example — wire into deleteCmsPage)
- Modify: `src/features/admin/user-management.ts` (wire into grantRole, revokeRoleAction)

This task demonstrates wiring `writeAuditLog` into two representative server actions. Apply the same pattern to other actions (product delete, PO status change, etc.) as those features are built.

- [ ] **Step 1: Wire into `deleteCmsPage` in `src/features/cms/admin-actions.ts`**

```ts
// At the top of the file, add:
import { writeAuditLog } from "@/src/features/admin/audit";

// In deleteCmsPage, after the successful delete, add:
export async function deleteCmsPage(pageKey: string): Promise<void> {
  const parsed = z.string().min(1).safeParse(pageKey);
  if (!parsed.success) throw new Error("Invalid page key.");

  const client = await createServerClient();
  const session = await client.auth.getSession();
  await requireAdminPermission(client, "cms:update");

  const { error } = await client.from("cms_pages").delete().eq("page_key", parsed.data);
  if (error) throw error;

  await writeAuditLog(client, {
    actorId: session.data.session?.user.id,
    action: "delete",
    tableName: "cms_pages",
    oldValues: { page_key: parsed.data },
  });

  revalidatePath("/admin/content");
}
```

- [ ] **Step 2: Wire into `grantRole` in `src/features/admin/user-management.ts`**

```ts
// At the top of user-management.ts, add:
import { writeAuditLog } from "@/src/features/admin/audit";

// In grantRole, after the successful insert, add:
  const session = await client.auth.getSession();
  await writeAuditLog(client, {
    actorId: session.data.session?.user.id,
    action: "grant_role",
    tableName: "user_admin_roles",
    newValues: { user_id: result.data.userId, role_id: result.data.roleId },
  });
```

- [ ] **Step 3: Commit**

```bash
git add src/features/cms/admin-actions.ts src/features/admin/user-management.ts
git commit -m "feat(admin): wire writeAuditLog into delete and role grant actions"
```
