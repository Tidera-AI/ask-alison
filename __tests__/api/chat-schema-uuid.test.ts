import { describe, expect, it } from "vitest";
import { chatRequestSchema } from "@/app/(chat)/api/chat/schema";

const CHAT_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("chatRequestSchema uuid", () => {
  it("accepts a valid uuid chat id", () => {
    const result = chatRequestSchema.safeParse({
      id: CHAT_ID,
      message: { role: "user", content: "Hello" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid chat id", () => {
    const result = chatRequestSchema.safeParse({
      id: "chat-1",
      message: { role: "user", content: "Hello" },
    });
    expect(result.success).toBe(false);
  });
});
