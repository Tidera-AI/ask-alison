import { describe, expect, it } from "vitest";
import {
  type DbMessageRow,
  dbMessagesToUiMessages,
  dbMessageToUiMessage,
} from "./history";

function row(overrides: Partial<DbMessageRow> = {}): DbMessageRow {
  return {
    id: "m1",
    role: "assistant",
    content: "Here is some advice [1].",
    sources: null,
    created_at: "2026-06-19T00:00:00Z",
    ...overrides,
  };
}

const source = {
  index: 1,
  id: "s1",
  label: "Was It Something I Said?, Ch. 1",
  source: "book",
  url: null,
};

describe("dbMessageToUiMessage", () => {
  it("rebuilds a data-sources part when sources are present", () => {
    const ui = dbMessageToUiMessage(row({ sources: [source] }));
    expect(ui.parts).toHaveLength(2);
    expect(ui.parts[0]).toEqual({
      type: "data-sources",
      id: "sources",
      data: [source],
    });
    expect(ui.parts[1]).toEqual({ type: "text", text: row().content });
  });

  it("rebuilds a no-context notice for an empty sources array", () => {
    const ui = dbMessageToUiMessage(row({ sources: [] }));
    expect(ui.parts[0]).toEqual({
      type: "data-notice",
      id: "notice",
      data: { kind: "no-context" },
    });
  });

  it("adds no data part for legacy null sources", () => {
    const ui = dbMessageToUiMessage(row({ sources: null }));
    expect(ui.parts).toHaveLength(1);
    expect(ui.parts[0].type).toBe("text");
  });

  it("never adds a sources part for user messages", () => {
    const ui = dbMessageToUiMessage(
      row({ role: "user", content: "Help me", sources: [] })
    );
    expect(ui.parts).toHaveLength(1);
    expect(ui.parts[0].type).toBe("text");
  });

  it("preserves id, role, and createdAt", () => {
    const ui = dbMessageToUiMessage(row({ id: "abc" }));
    expect(ui).toMatchObject({
      id: "abc",
      role: "assistant",
      createdAt: "2026-06-19T00:00:00Z",
    });
  });
});

describe("dbMessagesToUiMessages", () => {
  it("maps a list preserving order", () => {
    const ui = dbMessagesToUiMessages([
      row({ id: "a", role: "user", content: "Q" }),
      row({ id: "b", sources: [source] }),
    ]);
    expect(ui.map((m) => m.id)).toEqual(["a", "b"]);
    expect(ui[1].parts[0].type).toBe("data-sources");
  });
});
