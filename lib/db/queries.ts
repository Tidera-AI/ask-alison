import { supabase } from "./supabase";

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
}: {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
}) {
  const { error } = await supabase
    .from("message")
    .insert({ id, chat_id, role, content });

  if (error) {
    throw new Error(`Failed to save message: ${error.message}`);
  }
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
