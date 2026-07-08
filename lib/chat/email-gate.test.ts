import { describe, expect, it } from "vitest";
import { requiresEmailGate } from "./email-gate";

describe("requiresEmailGate", () => {
  it("allows the first user message when no email is on file", () => {
    expect(
      requiresEmailGate({ email: null, userMessageCountInSession: 0 })
    ).toBe(false);
  });

  it("blocks the second user message in the session without email", () => {
    expect(
      requiresEmailGate({ email: null, userMessageCountInSession: 1 })
    ).toBe(true);
  });

  it("never blocks when email is already captured", () => {
    expect(
      requiresEmailGate({
        email: "guest@example.com",
        userMessageCountInSession: 5,
      })
    ).toBe(false);
  });
});
