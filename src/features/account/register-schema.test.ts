import { describe, expect, it } from "vitest";
import { safeNextPath } from "./customer-link";
import { registerSchema } from "./register-schema";

const valid = {
  fullName: "Nguyễn Văn A",
  phone: "0901 234 567",
  email: "Khach@Example.com ",
  password: "matkhau123",
  confirmPassword: "matkhau123",
};

describe("registerSchema", () => {
  it("normalises phone and email", () => {
    const result = registerSchema.parse(valid);
    expect(result.phone).toBe("0901234567");
    expect(result.email).toBe("khach@example.com");
  });

  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: "khac12345" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Mật khẩu nhập lại không khớp.");
  });

  it("rejects short passwords and bad phones", () => {
    expect(registerSchema.safeParse({ ...valid, password: "123", confirmPassword: "123" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, phone: "12345" }).success).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("allows relative paths only", () => {
    expect(safeNextPath("/checkout", "/x")).toBe("/checkout");
    expect(safeNextPath("//evil.com", "/x")).toBe("/x");
    expect(safeNextPath("https://evil.com", "/x")).toBe("/x");
    expect(safeNextPath(null, "/x")).toBe("/x");
  });
});
