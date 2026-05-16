import { beforeEach, describe, expect, it } from "vitest";
import {
  buildWhatsappLink,
  normalizePhone,
  paymentInstructionsMessage,
  welcomeMessage,
} from "./templates";

describe("normalizePhone", () => {
  it("strips spaces, dashes, and plus", () => {
    expect(normalizePhone("+20 100 123-4567")).toBe("201001234567");
  });
  it("tolerates empty input", () => {
    expect(normalizePhone("")).toBe("");
  });
});

describe("buildWhatsappLink", () => {
  it("URL-encodes the message and cleans the phone", () => {
    const link = buildWhatsappLink("+20 100 111 2222", "hi there");
    expect(link).toBe("https://wa.me/201001112222?text=hi%20there");
  });

  it("falls back to wa.me root when phone is blank", () => {
    const link = buildWhatsappLink("", "hi");
    expect(link).toBe("https://wa.me/?text=hi");
  });

  it("omits the query string when no message is supplied", () => {
    expect(buildWhatsappLink("+20 100 111 2222", "")).toBe(
      "https://wa.me/201001112222",
    );
    expect(buildWhatsappLink("", "")).toBe("https://wa.me/");
  });
});

describe("paymentInstructionsMessage", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_COACH_VODAFONE_NUMBER = "+201111111111";
    process.env.NEXT_PUBLIC_COACH_NAME = "Ahmed";
  });

  it("uses EN template and includes amount + vodafone number", () => {
    const msg = paymentInstructionsMessage({
      clientName: "John",
      amount: 1500,
      currency: "EGP",
      packageName: "3 months premium",
      locale: "en",
    });
    expect(msg).toContain("Hi John");
    expect(msg).toContain("1500 EGP");
    expect(msg).toContain("Vodafone Cash");
    expect(msg).toContain("+201111111111");
    expect(msg).toContain("Ahmed");
    expect(msg).toContain("3 months premium");
  });

  it("uses AR template when locale=ar", () => {
    const msg = paymentInstructionsMessage({
      clientName: "أحمد",
      amount: 1500,
      locale: "ar",
    });
    expect(msg).toContain("فودافون كاش");
    expect(msg).toContain("1500 EGP");
  });
});

describe("welcomeMessage", () => {
  it("includes all login fields when an explicit password is supplied", () => {
    const msg = welcomeMessage({
      clientName: "John",
      loginUrl: "https://example.com/login",
      email: "john@example.com",
      tempPassword: "abc123!",
      locale: "en",
    });
    expect(msg).toContain("https://example.com/login");
    expect(msg).toContain("john@example.com");
    expect(msg).toContain("abc123!");
  });

  it("omits the password from the deeplink when not provided", () => {
    const msg = welcomeMessage({
      clientName: "John",
      loginUrl: "https://example.com/login",
      email: "john@example.com",
      locale: "en",
    });
    expect(msg).toContain("https://example.com/login");
    expect(msg).toContain("john@example.com");
    expect(msg).toContain("separate message");
    expect(msg).not.toMatch(/Temporary password:/i);
  });
});
