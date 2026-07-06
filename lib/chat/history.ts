import type { ChatSource } from "@/lib/rag/format";

// A persisted message row as returned by getMessagesByChatId. `sources` is the
// jsonb column added in migration 004 (may be absent on legacy rows).
export interface DbMessageRow {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: unknown;
  created_at: string;
}

export interface UiMessagePart {
  type: string;
  id?: string;
  text?: string;
  data?: unknown;
}

export interface UiMessage {
  id: string;
  role: "user" | "assistant";
  parts: UiMessagePart[];
  createdAt: string;
}

// Rebuild the sources/notice data part from the persisted `sources` value:
//   [..]  -> "Used N sources" panel + inline citations
//   []    -> graceful "no context" notice (searched, nothing relevant)
//   null  -> no notice (skipped retrieval or legacy message)
function sourcesPart(row: DbMessageRow): UiMessagePart | null {
  if (row.role !== "assistant" || !Array.isArray(row.sources)) {
    return null;
  }
  if (row.sources.length > 0) {
    return {
      type: "data-sources",
      id: "sources",
      data: row.sources as ChatSource[],
    };
  }
  return { type: "data-notice", id: "notice", data: { kind: "no-context" } };
}

export function dbMessageToUiMessage(row: DbMessageRow): UiMessage {
  const parts: UiMessagePart[] = [];

  const sources = sourcesPart(row);
  if (sources) {
    parts.push(sources);
  }
  parts.push({ type: "text", text: row.content });

  return {
    id: row.id,
    role: row.role,
    parts,
    createdAt: row.created_at,
  };
}

export function dbMessagesToUiMessages(rows: DbMessageRow[]): UiMessage[] {
  return rows.map(dbMessageToUiMessage);
}
