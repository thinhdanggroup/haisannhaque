import { createClient } from "@supabase/supabase-js";
import type { MetadataRoute } from "next";
import { getSupabaseServerUrl } from "@/src/lib/supabase/url";

const SITE_URL = "https://haisannhaque.com";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: "daily", priority: 0.7 },
  ];

  try {
    const client = createClient(
      getSupabaseServerUrl(),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const [productsResult, categoriesResult] = await Promise.all([
      client.from("products").select("slug").eq("status", "published"),
      client.from("categories").select("slug").eq("is_active", true),
    ]);

    const productUrls: MetadataRoute.Sitemap = (productsResult.data ?? []).map(
      ({ slug }: { slug: string }) => ({
        url: `${SITE_URL}/products/${slug}`,
        changeFrequency: "weekly",
        priority: 0.8,
      }),
    );

    const categoryUrls: MetadataRoute.Sitemap = (categoriesResult.data ?? []).map(
      ({ slug }: { slug: string }) => ({
        url: `${SITE_URL}/categories/${slug}`,
        changeFrequency: "daily",
        priority: 0.9,
      }),
    );

    return [...staticRoutes, ...categoryUrls, ...productUrls];
  } catch {
    return staticRoutes;
  }
}
