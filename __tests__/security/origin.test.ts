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
  it("allows this project's Vercel preview domains in production", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    for (const host of [
      "ask-alison-rawmqhzlu-elevateetiquettes-projects.vercel.app",
      "ask-alison-git-main-elevateetiquettes-projects.vercel.app",
    ]) {
      expect(
        isAllowedMutatingOrigin(headers({ origin: `https://${host}` }))
      ).toBe(true);
    }
    process.env.NODE_ENV = prev;
  });

  it("blocks other vercel.app sites in production", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    for (const host of [
      "evil.vercel.app",
      "ask-alison-evil.vercel.app",
      "evil-elevateetiquettes-projects.vercel.app",
    ]) {
      expect(
        isAllowedMutatingOrigin(headers({ origin: `https://${host}` }))
      ).toBe(false);
    }
    process.env.NODE_ENV = prev;
  });
});
