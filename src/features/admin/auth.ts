import { canAccess } from "./permissions";

export type AdminContext = {
  userId: string;
  roles: string[];
};

export class AdminAuthorizationError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminAuthorizationError";
    this.status = status;
  }
}

type AdminRoleRow = {
  admin_roles: { name: string } | Array<{ name: string }> | null;
};

type AdminRoleQueryResult = PromiseLike<{
  data: unknown;
  error: unknown;
}>;

type AdminAuthClient = {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string } | null };
      error: unknown;
    }>;
  };
  from: (table: "user_admin_roles") => {
    select: (columns: string) => {
      eq: (column: "user_id", value: string) => AdminRoleQueryResult;
    };
  };
};

function extractRoleName(row: AdminRoleRow): string | null {
  if (Array.isArray(row.admin_roles)) {
    return row.admin_roles[0]?.name ?? null;
  }

  return row.admin_roles?.name ?? null;
}

export async function requireAdminPermission(
  client: unknown,
  permission: string,
): Promise<AdminContext> {
  const adminClient = client as AdminAuthClient;
  const {
    data: { user },
    error: userError,
  } = await adminClient.auth.getUser();

  if (userError || !user) {
    throw new AdminAuthorizationError("Authentication required", 401);
  }

  const { data, error } = await adminClient
    .from("user_admin_roles")
    .select("admin_roles(name)")
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  const roles = ((data ?? []) as AdminRoleRow[])
    .map(extractRoleName)
    .filter((role): role is string => Boolean(role));

  if (!canAccess(roles, permission)) {
    throw new AdminAuthorizationError("Permission denied", 403);
  }

  return {
    userId: user.id,
    roles,
  };
}

export function createAdminErrorResponse(error: AdminAuthorizationError): Response {
  return Response.json({ error: error.message }, { status: error.status });
}
