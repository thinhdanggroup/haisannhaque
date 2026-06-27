import { describe, expect, it } from "vitest";
import { normalizeContactHref, CONTACT_URLS } from "./mobile-storefront-dock";

describe("normalizeContactHref", () => {
  it("maps #messenger anchor to the real Messenger URL", () => {
    expect(normalizeContactHref("#messenger")).toBe(CONTACT_URLS.messenger);
  });

  it("maps #zalo anchor to the real Zalo URL", () => {
    expect(normalizeContactHref("#zalo")).toBe(CONTACT_URLS.zalo);
  });

  it("maps the demo phone number to the real phone tel: link", () => {
    expect(normalizeContactHref("tel:19000098")).toBe(CONTACT_URLS.phone);
  });

  it("passes through internal paths unchanged", () => {
    expect(normalizeContactHref("/search")).toBe("/search");
    expect(normalizeContactHref("/account/orders")).toBe("/account/orders");
  });

  it("passes through canonical contact URLs unchanged", () => {
    expect(normalizeContactHref(CONTACT_URLS.messenger)).toBe(CONTACT_URLS.messenger);
    expect(normalizeContactHref(CONTACT_URLS.zalo)).toBe(CONTACT_URLS.zalo);
    expect(normalizeContactHref(CONTACT_URLS.phone)).toBe(CONTACT_URLS.phone);
  });

  it("passes through unknown hrefs unchanged", () => {
    expect(normalizeContactHref("#unknown")).toBe("#unknown");
    expect(normalizeContactHref("https://example.com")).toBe("https://example.com");
  });
});
