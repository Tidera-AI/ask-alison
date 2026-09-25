import { describe, expect, it } from "vitest";
import { isAllowedMutatingOrigin } from "@/lib/security/origin";

function headers(init: Record<string, string>): Headers {
  return new Headers(init);
}

describe("isAllowedMutatingOrigin", () => {
  it("allows localhost in development", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    expect(isAllowedMutatingOrigin(headers({}))).toBe(true);
    process.env.NODE_ENV = prev;
  });

  it("allows elevateetiquette.com origin in production", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    expect(
      isAllowedMutatingOrigin(
        headers({ origin: "https://elevateetiquette.com" })
      )
    ).toBe(true);
    process.env.NODE_ENV = prev;
  });

  it("blocks unknown origins in production", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    expect(
      isAllowedMutatingOrigin(headers({ origin: "https://evil.example" }))
    ).toBe(false);
    process.env.NODE_ENV = prev;
  });
  it("allows a same-origin request on any deployment URL", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const host = "ask-alison-rawmqhzlu-elevateetiquettes-projects.vercel.app";
    expect(
      isAllowedMutatingOrigin(headers({ origin: `https://${host}`, host }))
    ).toBe(true);
    process.env.NODE_ENV = prev;
  });

  it("blocks lookalike vercel.app origins that are not the request host", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    for (const origin of [
      "https://evil.vercel.app",
      "https://ask-alison-attacker-elevateetiquettes-projects.vercel.app",
    ]) {
      expect(
        isAllowedMutatingOrigin(
          headers({ origin, host: "ask-alison-six.vercel.app" })
        )
      ).toBe(false);
    }
    process.env.NODE_ENV = prev;
  });

  it("compares port as part of the same-origin check", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    expect(
      isAllowedMutatingOrigin(
        headers({ origin: "https://app.test:8443", host: "app.test" })
      )
    ).toBe(false);
    expect(
      isAllowedMutatingOrigin(
        headers({ origin: "https://app.test:8443", host: "app.test:8443" })
      )
    ).toBe(true);
    process.env.NODE_ENV = prev;
  });
});
