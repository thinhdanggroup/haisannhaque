export function getSupabaseServerUrl(
  source: Record<string, string | undefined> = process.env,
): string {
  return source.SUPABASE_INTERNAL_URL ?? source.NEXT_PUBLIC_SUPABASE_URL!;
}
