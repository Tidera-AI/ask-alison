import { describe, expect, it } from "vitest";
import { chatRequestSchema, extractMessageText } from "./schema";

const CHAT_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("chatRequestSchema", () => {
  it("accepts message with content string", () => {
    const result = chatRequestSchema.safeParse({
      id: CHAT_ID,
      message: { role: "user", content: "Hello" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts message with parts array", () => {
    const result = chatRequestSchema.safeParse({
      id: CHAT_ID,
      message: {
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts message with both content and parts", () => {
    const result = chatRequestSchema.safeParse({
      id: CHAT_ID,
      message: {
        role: "user",
        content: "Hello",
        parts: [{ type: "text", text: "Hello" }],
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects message with wrong role", () => {
    const result = chatRequestSchema.safeParse({
      id: CHAT_ID,
      message: { role: "assistant", content: "Hello" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing id", () => {
    const result = chatRequestSchema.safeParse({
      message: { role: "user", content: "Hello" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional selectedChatModel", () => {
    const result = chatRequestSchema.safeParse({
      id: CHAT_ID,
      message: { role: "user", content: "Hello" },
      selectedChatModel: "anthropic/claude-haiku-4.5",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional isFirstMessage", () => {
    const result = chatRequestSchema.safeParse({
      id: "chat-1",
      message: { role: "user", content: "Hello" },
      isFirstMessage: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("extractMessageText", () => {
  it("extracts text from content field", () => {
    const text = extractMessageText({ role: "user", content: "Hello world" });
    expect(text).toBe("Hello world");
  });

  it("extracts text from parts array", () => {
    const text = extractMessageText({
      role: "user",
      parts: [{ type: "text", text: "From parts" }],
    });
    expect(text).toBe("From parts");
  });

  it("prefers content over parts when both present", () => {
    const text = extractMessageText({
      role: "user",
      content: "From content",
      parts: [{ type: "text", text: "From parts" }],
    });
    expect(text).toBe("From content");
  });

  it("returns null when neither content nor parts", () => {
    const text = extractMessageText({ role: "user" });
    expect(text).toBeNull();
  });

  it("returns null for empty parts array", () => {
    const text = extractMessageText({ role: "user", parts: [] });
    expect(text).toBeNull();
  });
});
