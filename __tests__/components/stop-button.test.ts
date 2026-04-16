import { describe, expect, it } from "vitest";

type Status = "ready" | "submitted" | "streaming" | "error";
type Message = { id: string; role: "user" | "assistant"; parts: unknown[] };

/** Mirrors the condition in multimodal-input.tsx line 533 */
function shouldShowStopButton(status: Status): boolean {
  return status === "submitted" || status === "streaming";
}

/** Mirrors the setMessages callback in StopButton onClick */
function messagesAfterStop(msgs: Message[]): Message[] {
  const lastMsg = msgs.at(-1);
  if (!lastMsg || lastMsg.role === "user") {
    return [
      ...msgs,
      {
        id: `stopped-${Date.now()}`,
        role: "assistant" as const,
        parts: [{ type: "text" as const, text: "*Generation stopped.*" }],
      },
    ];
  }
  return msgs;
}

describe("shouldShowStopButton", () => {
  it("shows during submitted status", () => {
    expect(shouldShowStopButton("submitted")).toBe(true);
  });

  it("shows during streaming status", () => {
    expect(shouldShowStopButton("streaming")).toBe(true);
  });

  it("hides when ready", () => {
    expect(shouldShowStopButton("ready")).toBe(false);
  });

  it("hides on error", () => {
    expect(shouldShowStopButton("error")).toBe(false);
  });
});

describe("messagesAfterStop", () => {
  it("appends stopped message when last message is from user", () => {
    const msgs: Message[] = [
      { id: "1", role: "user", parts: [{ type: "text", text: "Hello" }] },
    ];

    const result = messagesAfterStop(msgs);

    expect(result).toHaveLength(2);
    expect(result[1].role).toBe("assistant");
    expect(result[1].parts).toEqual([
      { type: "text", text: "*Generation stopped.*" },
    ]);
  });

  it("appends stopped message when messages are empty", () => {
    const result = messagesAfterStop([]);

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe("assistant");
  });

  it("does NOT append when last message is from assistant (partial response exists)", () => {
    const msgs: Message[] = [
      { id: "1", role: "user", parts: [{ type: "text", text: "Hello" }] },
      {
        id: "2",
        role: "assistant",
        parts: [{ type: "text", text: "I understand" }],
      },
    ];

    const result = messagesAfterStop(msgs);

    expect(result).toBe(msgs);
    expect(result).toHaveLength(2);
  });

  it("preserves all existing messages", () => {
    const msgs: Message[] = [
      { id: "1", role: "user", parts: [{ type: "text", text: "First" }] },
      {
        id: "2",
        role: "assistant",
        parts: [{ type: "text", text: "Response" }],
      },
      { id: "3", role: "user", parts: [{ type: "text", text: "Second" }] },
    ];

    const result = messagesAfterStop(msgs);

    expect(result).toHaveLength(4);
    expect(result[0]).toBe(msgs[0]);
    expect(result[1]).toBe(msgs[1]);
    expect(result[2]).toBe(msgs[2]);
    expect(result[3].role).toBe("assistant");
  });
});
