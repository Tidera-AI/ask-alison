// Stub type definitions — this project uses Supabase directly via lib/db/queries.ts
// These types mirror the database schema for use across UI components.

export type Chat = {
  id: string;
  title: string;
  userId: string;
  visibility: "private" | "public";
  createdAt: Date;
};

export type DBMessage = {
  id: string;
  chatId: string;
  role: "user" | "assistant";
  content: string;
  parts: unknown;
  createdAt: Date;
};

export type Vote = {
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
};

export type Document = {
  id: string;
  title: string;
  content: string | null;
  kind: "text" | "code" | "sheet" | "image";
  userId: string;
  createdAt: Date;
};

export type Suggestion = {
  id: string;
  documentId: string;
  documentCreatedAt: Date;
  originalText: string;
  suggestedText: string;
  description: string | null;
  isResolved: boolean;
  userId: string;
  createdAt: Date;
};
