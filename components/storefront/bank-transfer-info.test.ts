import { describe, expect, it } from "vitest";
import { splitAccountDetails } from "./bank-transfer-info";

describe("splitAccountDetails", () => {
  it("splits the one-line admin entry into display lines", () => {
    expect(
      splitAccountDetails(
        "Thanh toán chuyển khoản: Ho Kinh Doanh Cơm Nha Vi Que - 1903 7253 7380 24 - TECHCOMBANK",
      ),
    ).toEqual(["Ho Kinh Doanh Cơm Nha Vi Que", "1903 7253 7380 24", "TECHCOMBANK"]);
  });

  it("keeps hyphenated words intact", () => {
    expect(splitAccountDetails("Vietcombank - 0123 - NGUYEN-VAN A")).toEqual([
      "Vietcombank",
      "0123",
      "NGUYEN-VAN A",
    ]);
  });
});
