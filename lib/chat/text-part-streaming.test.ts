import { describe, expect, it } from "vitest";
import { isAssistantTextPartStreaming } from "./text-part-streaming";

describe("isAssistantTextPartStreaming", () => {
  it("is false for user messages even while loading", () => {
    expect(
      isAssistantTextPartStreaming(
        { type: "text", text: "hello", state: "streaming" },
        false,
        true
      )
    ).toBe(false);
  });

  it("is true for assistant parts explicitly marked streaming", () => {
    expect(
      isAssistantTextPartStreaming(
        { type: "text", text: "hello", state: "streaming" },
        true,
        true
      )
    ).toBe(true);
  });

  it("is false once the assistant part is done", () => {
    expect(
      isAssistantTextPartStreaming(
        { type: "text", text: "hello", state: "done" },
        true,
        true
      )
    ).toBe(false);
  });

  it("is false when the message is no longer loading", () => {
    expect(
      isAssistantTextPartStreaming(
        { type: "text", text: "hello", state: "streaming" },
        true,
        false
      )
    ).toBe(false);
  });
});
