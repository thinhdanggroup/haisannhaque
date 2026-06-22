"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";

export type ImportResult = {
  imported: number;
  errors: Array<{ row: number; message: string }>;
} | null;

// Parses a single CSV line, handling double-quoted fields (RFC 4180 subset).
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

const rowSchema = z.object({
  name: z.string().min(1, "name is required"),
  status: z
    .enum(["draft", "published", ""])
    .transform((v) => (v === "" ? "draft" : v)),
  temperature_class: z.enum(["live", "fresh", "chilled", "frozen", "ready"], {
    error: "temperature_class must be one of: live, fresh, chilled, frozen, ready",
  }),
  origin: z.string(),
  short_description: z.string(),
  description: z.string(),
  sku: z.string().min(1, "sku is required"),
  unit: z.string().min(1, "unit is required"),
  list_price: z
    .string()
    .refine((v) => v !== "" && !isNaN(Number(v)) && Number(v) >= 0, {
      message: "list_price must be a number ≥ 0",
    })
    .transform(Number),
  sale_price: z
    .string()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (typeof v === "number" && !isNaN(v) && v >= 0), {
      message: "sale_price must be a number ≥ 0 or blank",
    }),
});

export async function importProducts(
  _prev: ImportResult,
  formData: FormData,
): Promise<ImportResult> {
  const client = await createServerClient();
  await requireAdminPermission(client, "products:update");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { imported: 0, errors: [{ row: 0, message: "No file provided" }] };
  }

  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { imported: 0, errors: [{ row: 0, message: "CSV has no data rows" }] };
  }

  const dataLines = lines.slice(1);

  let imported = 0;
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < dataLines.length; i++) {
    const rowNumber = i + 2; // row 1 is the header
    const fields = parseCsvLine(dataLines[i]);

    const raw = {
      name: fields[0] ?? "",
      status: fields[1] ?? "",
      temperature_class: fields[2] ?? "",
      origin: fields[3] ?? "",
      short_description: fields[4] ?? "",
      description: fields[5] ?? "",
      sku: fields[6] ?? "",
      unit: fields[7] ?? "",
      list_price: fields[8] ?? "",
      sale_price: fields[9] ?? "",
    };

    const parsed = rowSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({
        row: rowNumber,
        message: parsed.error.issues[0]?.message ?? "Validation error",
      });
      continue;
    }

    const d = parsed.data;
    const slug = makeSlug(d.name);

    const { data: productData, error: productError } = await client
      .from("products")
      .insert({
        name: d.name,
        slug,
        status: d.status,
        short_description: d.short_description,
        description: d.description,
        origin: d.origin,
        temperature_class: d.temperature_class,
      })
      .select("id")
      .single();

    if (productError) {
      errors.push({ row: rowNumber, message: productError.message });
      continue;
    }

    const { error: variantError } = await client.from("product_variants").insert({
      product_id: productData.id,
      sku: d.sku,
      unit: d.unit,
      list_price: d.list_price,
      sale_price: d.sale_price,
      is_active: true,
      is_weighable: false,
    });

    if (variantError) {
      errors.push({ row: rowNumber, message: variantError.message });
      continue;
    }

    imported++;
  }

  revalidatePath("/admin/products");
  return { imported, errors };
}
