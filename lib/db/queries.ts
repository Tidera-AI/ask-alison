import type { ChatSource } from "@/lib/rag/format";
import { supabase } from "./supabase";

// PostgREST raises PGRST204 when a column is absent from its schema cache —
// used to degrade gracefully before migration 004 (message.sources) is applied.
function isUnknownColumnError(error: { code?: string } | null): boolean {
  return error?.code === "PGRST204";
}

// --- User ---

export async function getOrCreateUser(userId: string) {
  const { data: existing } = await supabase
    .from("user")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const { data: created, error } = await supabase
    .from("user")
    .insert({ id: userId })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }
  return created;
}

// --- Chat ---

export async function saveChat({
  id,
  user_id,
  title,
}: {
  id: string;
  user_id: string;
  title: string;
}) {
  const { error } = await supabase.from("chat").insert({ id, user_id, title });
  if (error) {
    throw new Error(`Failed to save chat: ${error.message}`);
  }
}

export async function getChatById(chatId: string) {
  const { data, error } = await supabase
    .from("chat")
    .select("*")
    .eq("id", chatId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get chat: ${error.message}`);
  }
  return data;
}

export async function getChatsByUserId(userId: string) {
  const { data, error } = await supabase
    .from("chat")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get chats: ${error.message}`);
  }
  return data ?? [];
}

export async function updateChatTitle(chatId: string, title: string) {
  const { error } = await supabase
    .from("chat")
    .update({ title })
    .eq("id", chatId);

  if (error) {
    throw new Error(`Failed to update chat title: ${error.message}`);
  }
}

export async function updateChatVisibilityById(
  chatId: string,
  visibility: "private" | "public"
) {
  const { error } = await supabase
    .from("chat")
    .update({ visibility })
    .eq("id", chatId);

  if (error) {
    throw new Error(`Failed to update chat visibility: ${error.message}`);
  }
}

export async function deleteChatById(chatId: string) {
  const { error } = await supabase.from("chat").delete().eq("id", chatId);

  if (error) {
    throw new Error(`Failed to delete chat: ${error.message}`);
  }
}

// --- Messages ---

export async function saveMessage({
  id,
  chat_id,
  role,
  content,
  sources = null,
}: {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[] | null;
}) {
  const { error } = await supabase
    .from("message")
    .insert({ id, chat_id, role, content, sources });

  if (!error) {
    return;
  }

  // Before migration 004 adds the `sources` column, retry without it so chat
  // keeps working (citations simply won't persist until the migration runs).
  if (isUnknownColumnError(error)) {
    const { error: retryError } = await supabase
      .from("message")
      .insert({ id, chat_id, role, content });
    if (retryError) {
      throw new Error(`Failed to save message: ${retryError.message}`);
    }
    return;
  }

  throw new Error(`Failed to save message: ${error.message}`);
}

export async function saveMessages(
  messages: Array<{
    id: string;
    chat_id: string;
    role: "user" | "assistant";
    content: string;
  }>
) {
  const { error } = await supabase.from("message").insert(messages);
  if (error) {
    throw new Error(`Failed to save messages: ${error.message}`);
  }
}

export async function getMessagesByChatId(chatId: string) {
  const { data, error } = await supabase
    .from("message")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to get messages: ${error.message}`);
  }
  return data ?? [];
}
