import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactName: z.string(),
  phone: z.string(),
  email: z.string(),
  address: z.string(),
  taxCode: z.string(),
  isActive: z.boolean(),
});

export const supplierUpdateSchema = supplierSchema.extend({ id: z.string().uuid() });

export function validateSupplierInput(formData: FormData) {
  return supplierSchema.safeParse({
    name: formData.get("name"),
    contactName: formData.get("contactName") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    address: formData.get("address") ?? "",
    taxCode: formData.get("taxCode") ?? "",
    isActive: formData.get("isActive") === "true",
  });
}

export function validateSupplierUpdateInput(formData: FormData) {
  return supplierUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    contactName: formData.get("contactName") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    address: formData.get("address") ?? "",
    taxCode: formData.get("taxCode") ?? "",
    isActive: formData.get("isActive") === "true",
  });
}
