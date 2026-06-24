import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "./prompts";

const CTX =
  '[Source 1: Was It Something I Said?, Ch. 7 "Apologies"]:\nSample passage.';

describe("buildSystemPrompt — book & guardrail rules", () => {
  it("includes the Amazon book link when book context is present", () => {
    expect(buildSystemPrompt(CTX, { hasBookContext: true })).toContain(
      "https://www.amazon.com/dp/1400350123/"
    );
  });

  it("enforces a short book-quote cap", () => {
    expect(buildSystemPrompt(CTX, { hasBookContext: true })).toMatch(
      /never quote more than ~6/i
    );
  });

  it("instructs naming the specific chapter when book context is present", () => {
    expect(
      buildSystemPrompt(CTX, { hasBookContext: true }).toLowerCase()
    ).toContain("specific chapter");
  });

  it("points to other writing (Substack) when no book context", () => {
    expect(
      buildSystemPrompt(CTX, { hasBookContext: false }).toLowerCase()
    ).toContain("substack");
  });

  it("handles sensitive/personal questions with discretion", () => {
    expect(buildSystemPrompt(CTX).toLowerCase()).toContain("discretion");
  });

  it("keeps the strict grounding rule", () => {
    expect(buildSystemPrompt(CTX)).toContain(
      "Only answer from the retrieved context"
    );
  });
});
