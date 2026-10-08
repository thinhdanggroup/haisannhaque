import { describe, expect, it } from "vitest";
import { parseInline, parseSupportBody, slugifyVietnamese } from "./support-pages";

describe("slugifyVietnamese", () => {
  it("strips diacritics and đ", () => {
    expect(slugifyVietnamese("Chính sách đổi trả & hoàn tiền")).toBe("chinh-sach-doi-tra-hoan-tien");
    expect(slugifyVietnamese("  Hướng dẫn ĐẶT HÀNG  ")).toBe("huong-dan-dat-hang");
  });
});

describe("parseSupportBody", () => {
  it("groups headings, paragraphs, bullets and numbered steps", () => {
    const body = [
      "## Đặt hàng",
      "",
      "Dòng một",
      "dòng hai",
      "",
      "1. Chọn sản phẩm",
      "2. Thanh toán",
      "- Ghi chú A",
      "- Ghi chú B",
    ].join("\n");

    expect(parseSupportBody(body)).toEqual([
      { type: "heading", text: "Đặt hàng" },
      { type: "paragraph", lines: ["Dòng một", "dòng hai"] },
      { type: "steps", items: ["Chọn sản phẩm", "Thanh toán"] },
      { type: "bullets", items: ["Ghi chú A", "Ghi chú B"] },
    ]);
  });

  it("returns nothing for an empty body", () => {
    expect(parseSupportBody("  \n\n")).toEqual([]);
  });
});

describe("parseInline", () => {
  it("extracts bold runs and links", () => {
    expect(parseInline("Gọi **086 799 7200** hoặc xem https://x.vn/a.")).toEqual([
      { type: "text", text: "Gọi " },
      { type: "bold", text: "086 799 7200" },
      { type: "text", text: " hoặc xem " },
      { type: "link", text: "https://x.vn/a" },
      { type: "text", text: "." },
    ]);
  });
});
