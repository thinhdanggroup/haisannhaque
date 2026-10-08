import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { CmsSupportPage } from "./types";

/** Footer group the support pages are listed under. */
export const SUPPORT_FOOTER_GROUP = "Hỗ trợ khách hàng";

export function supportPageHref(slug: string): string {
  return `/ho-tro/${slug}`;
}

/** "Chính sách đổi trả" → "chinh-sach-doi-tra" */
export function slugifyVietnamese(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export const supportPageInputSchema = z.object({
  title: z.string().trim().min(1, "Vui lòng nhập tiêu đề.").max(150),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch ngang."),
  body: z.string().max(50_000, "Nội dung quá dài."),
  sortOrder: z.coerce.number().int().min(0),
  isPublished: z.boolean(),
});

export type SupportPageInput = z.infer<typeof supportPageInputSchema>;

// ── Body format ────────────────────────────────────────────────────────────
// Staff write plain text. A few markers give structure without HTML:
//   "## Tiêu đề"  heading      "- mục"  bullet      "1. bước"  numbered step
//   blank line    new paragraph            **chữ đậm**  bold

export type SupportBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "bullets"; items: string[] }
  | { type: "steps"; items: string[] };

export function parseSupportBody(body: string): SupportBlock[] {
  const blocks: SupportBlock[] = [];
  let current: SupportBlock | null = null;

  const flush = () => {
    if (current) blocks.push(current);
    current = null;
  };

  for (const rawLine of body.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim();

    if (line === "") {
      flush();
      continue;
    }

    const heading = /^#{1,3}\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ type: "heading", text: heading[1].trim() });
      continue;
    }

    const bullet = /^[-*•]\s+(.+)$/.exec(line);
    if (bullet) {
      if (current?.type !== "bullets") flush();
      current ??= { type: "bullets", items: [] };
      (current as Extract<SupportBlock, { type: "bullets" }>).items.push(bullet[1].trim());
      continue;
    }

    const step = /^\d+[.)]\s+(.+)$/.exec(line);
    if (step) {
      if (current?.type !== "steps") flush();
      current ??= { type: "steps", items: [] };
      (current as Extract<SupportBlock, { type: "steps" }>).items.push(step[1].trim());
      continue;
    }

    if (current?.type !== "paragraph") flush();
    current ??= { type: "paragraph", lines: [] };
    (current as Extract<SupportBlock, { type: "paragraph" }>).lines.push(line);
  }

  flush();
  return blocks;
}

export type InlinePart = { type: "text" | "bold" | "link"; text: string };

/** Splits **bold** runs and bare http(s) links out of a line of text. */
export function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const pattern = /\*\*(.+?)\*\*|(https?:\/\/[^\s)]*[^\s).,;:!?])/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) parts.push({ type: "text", text: text.slice(lastIndex, index) });
    parts.push(match[1] !== undefined ? { type: "bold", text: match[1] } : { type: "link", text: match[2] });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) parts.push({ type: "text", text: text.slice(lastIndex) });
  return parts;
}

// ── Queries ────────────────────────────────────────────────────────────────

type SupportPageRow = {
  id: string;
  slug: string;
  title: string;
  body: string;
  sort_order: number;
  is_published: boolean;
  updated_at: string;
};

const SUPPORT_PAGE_COLUMNS = "id, slug, title, body, sort_order, is_published, updated_at";

function mapSupportPageRow(row: SupportPageRow): CmsSupportPage {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    body: row.body,
    sortOrder: row.sort_order,
    isPublished: row.is_published,
    updatedAt: row.updated_at,
  };
}

/** RLS limits anonymous readers to published pages. */
export async function getSupportPageBySlug(
  client: SupabaseClient,
  slug: string,
): Promise<CmsSupportPage | null> {
  const { data, error } = await client
    .from("cms_support_pages")
    .select(SUPPORT_PAGE_COLUMNS)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) throw error;
  return data ? mapSupportPageRow(data as SupportPageRow) : null;
}

export async function listSupportPages(client: SupabaseClient): Promise<CmsSupportPage[]> {
  const { data, error } = await client
    .from("cms_support_pages")
    .select(SUPPORT_PAGE_COLUMNS)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as SupportPageRow[]).map(mapSupportPageRow);
}

export async function getSupportPageById(
  client: SupabaseClient,
  id: string,
): Promise<CmsSupportPage | null> {
  const { data, error } = await client
    .from("cms_support_pages")
    .select(SUPPORT_PAGE_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapSupportPageRow(data as SupportPageRow) : null;
}
