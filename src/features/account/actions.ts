import { createServerClient } from "@/src/lib/supabase/server";

export type AccountSessionState =
  | {
      status: "authenticated";
      email: string | null;
    }
  | {
      status: "anonymous";
    }
  | {
      status: "unconfigured";
    };

export async function getAccountSessionState(): Promise<AccountSessionState> {
  try {
    const client = await createServerClient();
    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) {
      return { status: "anonymous" };
    }

    return {
      status: "authenticated",
      email: user.email ?? null,
    };
  } catch {
    return { status: "unconfigured" };
  }
}
