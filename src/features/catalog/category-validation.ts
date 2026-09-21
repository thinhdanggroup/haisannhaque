import { z } from "zod";
import { navigationIconKeys } from "@/components/storefront/category-nav";

/**
 * A form that never rendered the field should not silently pull a category out
 * of the menus, so only an explicit "false" hides it. The column defaults to
 * true for the same reason.
 */
function readShowInNav(formData: FormData): boolean {
  return formData.get("showInNav") !== "false";
}

/** "" means "no icon"; anything else must be a key the storefront can draw. */
const iconKeySchema = z
  .string()
  .refine((value) => value === "" || navigationIconKeys.includes(value), {
    message: "Unknown icon.",
  });

export const categorySchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, digits, and hyphens only"),
  name: z.string().min(1, "Name is required"),
  description: z.string(),
  imageUrl: z.string(),
  parentId: z.string().uuid().nullable(),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
  iconKey: iconKeySchema,
  showInNav: z.boolean(),
});

// Update schema excludes slug (immutable after creation)
export const categoryUpdateSchema = categorySchema
  .extend({ id: z.string().uuid() })
  .omit({ slug: true });

export function validateCategoryInput(formData: FormData) {
  return categorySchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    parentId: formData.get("parentId") && formData.get("parentId") !== "" ? formData.get("parentId") : null,
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") === "true",
    iconKey: formData.get("iconKey") ?? "",
    showInNav: readShowInNav(formData),
  });
}

export function validateCategoryUpdateInput(formData: FormData) {
  return categoryUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    parentId: formData.get("parentId") && formData.get("parentId") !== "" ? formData.get("parentId") : null,
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") === "true",
    iconKey: formData.get("iconKey") ?? "",
    showInNav: readShowInNav(formData),
  });
}
