"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";

function generateId() {
  return crypto.randomUUID();
}

export default function WidgetChat() {
  const chatId = useRef(
    typeof window === "undefined"
      ? generateId()
      : (sessionStorage.getItem("widget-chat-id") ?? generateId())
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("widget-chat-id", chatId.current);
    }
  }, []);

  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { id: chatId.current },
    }),
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) {
      return;
    }
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="flex flex-col h-screen max-h-screen">
      <div className="flex-shrink-0 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Ask Alison
        </h1>
        <p className="text-xs text-zinc-500">Etiquette guidance with grace</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500 text-center mt-8">
            Hi! I&apos;m an AI assistant trained on Alison&apos;s etiquette
            guidance. What can I help you with?
          </p>
        )}
        {messages.map((message) => (
          <div
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            key={message.id}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                message.role === "user"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              }`}
            >
              {message.parts.map((part) =>
                part.type === "text" ? (
                  <span key={part.text}>{part.text}</span>
                ) : null
              )}
            </div>
          </div>
        ))}
        {(status === "streaming" || status === "submitted") && (
          <div className="flex justify-start">
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-2 text-sm text-zinc-500">
              ...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        className="flex-shrink-0 border-t border-zinc-200 dark:border-zinc-800 px-4 py-3"
        onSubmit={handleSubmit}
      >
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            disabled={status === "streaming" || status === "submitted"}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask an etiquette question..."
            value={input}
          />
          <button
            className="rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
            disabled={
              status === "streaming" || status === "submitted" || !input.trim()
            }
            type="submit"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
