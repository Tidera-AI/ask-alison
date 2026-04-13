import { beforeEach, describe, expect, it, vi } from "vitest";

// Build a chainable mock that records calls and returns configured results.
function makeChain(result: unknown) {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const methods = [
    "from",
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "order",
    "maybeSingle",
    "single",
  ];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  // Terminal methods resolve to `result`
  (chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue(result);
  (chain.single as ReturnType<typeof vi.fn>).mockResolvedValue(result);
  // Non-terminal methods that still need to resolve (insert/update/delete with no further chain)
  // are handled by the final awaited call resolving to `result`.
  // We make `from` return a fresh sub-chain so each query is independent.
  return chain;
}

// We mock the entire supabase module before importing queries.
vi.mock("./supabase", () => {
  const supabase = {
    from: vi.fn(),
  };
  return { supabase };
});

import {
  getChatsByUserId,
  getMessagesByChatId,
  getOrCreateUser,
  saveChat,
} from "./queries";
// Import after mock is established.
import { supabase } from "./supabase";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getOrCreateUser", () => {
  it("returns existing user without inserting", async () => {
    const existingUser = { id: "user-1", created_at: "2024-01-01" };

    // First call: select → maybeSingle returns existing user
    const selectChain = makeChain({ data: existingUser, error: null });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      selectChain
    );

    const result = await getOrCreateUser("user-1");

    expect(result).toEqual(existingUser);
    // insert should NOT have been called
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("inserts and returns new user when none exists", async () => {
    const newUser = { id: "user-2", created_at: "2024-01-01" };

    // First call: select → maybeSingle returns null (no existing user)
    const selectChain = makeChain({ data: null, error: null });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      selectChain
    );

    // Second call: insert → single returns new user
    const insertChain = makeChain({ data: newUser, error: null });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      insertChain
    );

    const result = await getOrCreateUser("user-2");

    expect(result).toEqual(newUser);
    expect(supabase.from).toHaveBeenCalledTimes(2);
    expect(supabase.from).toHaveBeenNthCalledWith(2, "user");
  });
});

describe("saveChat", () => {
  it("calls insert on the chat table with correct fields", async () => {
    const insertChain = makeChain({ error: null });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    await saveChat({ id: "chat-1", user_id: "user-1", title: "Hello" });

    expect(supabase.from).toHaveBeenCalledWith("chat");
    expect(insertChain.insert).toHaveBeenCalledWith({
      id: "chat-1",
      user_id: "user-1",
      title: "Hello",
    });
  });

  it("throws when insert returns an error", async () => {
    const insertChain = makeChain(null);
    // insert is the terminal awaited call in saveChat — make it resolve with an error
    (insertChain.insert as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: { message: "db error" },
    });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    await expect(
      saveChat({ id: "chat-1", user_id: "user-1", title: "Hello" })
    ).rejects.toThrow("Failed to save chat: db error");
  });
});

describe("getMessagesByChatId", () => {
  it("returns messages ordered by created_at ascending", async () => {
    const messages = [
      { id: "msg-1", chat_id: "chat-1", role: "user", content: "Hi" },
      { id: "msg-2", chat_id: "chat-1", role: "assistant", content: "Hello!" },
    ];

    const chain = makeChain(null);
    // The final awaited call is `.order(...)` which returns a promise resolving to
    // { data: messages, error: null }. We override `order` to resolve directly.
    (chain.order as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: messages,
      error: null,
    });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const result = await getMessagesByChatId("chat-1");

    expect(result).toEqual(messages);
    expect(supabase.from).toHaveBeenCalledWith("message");
    expect(chain.eq).toHaveBeenCalledWith("chat_id", "chat-1");
    expect(chain.order).toHaveBeenCalledWith("created_at", { ascending: true });
  });

  it("returns empty array when data is null", async () => {
    const chain = makeChain(null);
    (chain.order as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: null,
    });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const result = await getMessagesByChatId("chat-1");
    expect(result).toEqual([]);
  });

  it("throws when query returns an error", async () => {
    const chain = makeChain(null);
    (chain.order as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: { message: "query failed" },
    });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    await expect(getMessagesByChatId("chat-1")).rejects.toThrow(
      "Failed to get messages: query failed"
    );
  });
});

describe("getChatsByUserId", () => {
  it("returns chats for a user", async () => {
    const chats = [{ id: "chat-1", user_id: "user-1", title: "Chat 1" }];
    const chain = makeChain(null);
    (chain.order as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: chats,
      error: null,
    });
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const result = await getChatsByUserId("user-1");
    expect(result).toEqual(chats);
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
  });
});
