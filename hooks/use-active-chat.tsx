"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { usePathname } from "next/navigation";
import {
  useCallback,
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { useDataStream } from "@/components/chat/data-stream-provider";
import { getChatHistoryPaginationKey } from "@/components/chat/sidebar-history";
import { toast } from "@/components/chat/toast";
import type { VisibilityType } from "@/components/chat/visibility-selector";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import type { Vote } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import { fetcher, fetchWithErrorHandlers, generateUUID, getTextFromMessage } from "@/lib/utils";

type ActiveChatContextValue = {
  chatId: string;
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  status: UseChatHelpers<ChatMessage>["status"];
  stop: UseChatHelpers<ChatMessage>["stop"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  visibilityType: VisibilityType;
  isReadonly: boolean;
  isChatInaccessible: boolean;
  canShowComposer: boolean;
  isLoading: boolean;
  votes: Vote[] | undefined;
  currentModelId: string;
  setCurrentModelId: (id: string) => void;
  showCreditCardAlert: boolean;
  setShowCreditCardAlert: Dispatch<SetStateAction<boolean>>;
  showEmailGate: boolean;
  hasEmailCaptured: boolean;
  onEmailCaptured: () => void;
};

const ActiveChatContext = createContext<ActiveChatContextValue | null>(null);

function extractChatId(pathname: string): string | null {
  const match = pathname.match(/\/chat\/([^/]+)/);
  return match ? match[1] : null;
}

export function ActiveChatProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { setDataStream } = useDataStream();
  const { mutate } = useSWRConfig();

  const chatIdFromUrl = extractChatId(pathname);
  const isNewChat = !chatIdFromUrl;
  const newChatIdRef = useRef(generateUUID());
  const prevPathnameRef = useRef(pathname);

  if (isNewChat && prevPathnameRef.current !== pathname) {
    newChatIdRef.current = generateUUID();
  }
  prevPathnameRef.current = pathname;

  const chatId = chatIdFromUrl ?? newChatIdRef.current;
  const isClientGeneratedChat =
    chatIdFromUrl !== null && chatIdFromUrl === newChatIdRef.current;
  const [clientChatSaved, setClientChatSaved] = useState(false);
  const shouldFetchMessages =
    !isNewChat && !(isClientGeneratedChat && !clientChatSaved);

  const [currentModelId, setCurrentModelId] = useState(DEFAULT_CHAT_MODEL);
  const currentModelIdRef = useRef(currentModelId);
  useEffect(() => {
    currentModelIdRef.current = currentModelId;
  }, [currentModelId]);

  const [input, setInput] = useState("");
  const [showCreditCardAlert, setShowCreditCardAlert] = useState(false);
  const [latchedInaccessibleId, setLatchedInaccessibleId] = useState<
    string | null
  >(null);
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [hasEmailCaptured, setHasEmailCaptured] = useState(false);
  const pendingMessageRef = useRef<string | null>(null);

  const {
    data: chatData,
    error: chatError,
    isLoading,
  } = useSWR(
    shouldFetchMessages
      ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/messages?chatId=${chatId}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    }
  );

  const { data: sessionData } = useSWR(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/session`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const initialMessages: ChatMessage[] = shouldFetchMessages
    ? (chatData?.messages ?? [])
    : [];
  const visibility: VisibilityType = shouldFetchMessages
    ? (chatData?.visibility ?? "private")
    : "private";

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
    addToolApprovalResponse,
  } = useChat<ChatMessage>({
    id: chatId,
    messages: initialMessages,
    generateId: generateUUID,
    sendAutomaticallyWhen: ({ messages: currentMessages }) => {
      const lastMessage = currentMessages.at(-1);
      return (
        lastMessage?.parts?.some(
          (part) =>
            "state" in part &&
            part.state === "approval-responded" &&
            "approval" in part &&
            (part.approval as { approved?: boolean })?.approved === true
        ) ?? false
      );
    },
    transport: new DefaultChatTransport({
      api: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chat`,
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest(request) {
        const lastMessage = request.messages.at(-1);
        const isToolApprovalContinuation =
          lastMessage?.role !== "user" ||
          request.messages.some((msg) =>
            msg.parts?.some((part) => {
              const state = (part as { state?: string }).state;
              return (
                state === "approval-responded" || state === "output-denied"
              );
            })
          );

        return {
          body: {
            id: request.id,
            ...(isToolApprovalContinuation
              ? { messages: request.messages }
              : {
                  message: lastMessage,
                  isFirstMessage:
                    !isToolApprovalContinuation &&
                    request.messages.length === 1,
                }),
            selectedChatModel: currentModelIdRef.current,
            selectedVisibilityType: visibility,
            ...request.body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
    },
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      if (error.message?.includes("AI Gateway requires a valid credit card")) {
        setShowCreditCardAlert(true);
      } else if (
        error instanceof ChatbotError &&
        error.cause === "email_required"
      ) {
        setMessages((current) => {
          const last = current.at(-1);
          if (last?.role === "user") {
            const text = getTextFromMessage(last);
            if (text) {
              pendingMessageRef.current = text;
            }
            return current.slice(0, -1);
          }
          return current;
        });
        setShowEmailGate(true);
      } else if (error instanceof ChatbotError) {
        toast({ type: "error", description: error.message });
      } else {
        toast({
          type: "error",
          description: error.message || "Oops, an error occurred!",
        });
      }
    },
  });

  const onEmailCaptured = useCallback(() => {
    setHasEmailCaptured(true);
    setShowEmailGate(false);

    const pending = pendingMessageRef.current;
    pendingMessageRef.current = null;
    if (pending) {
      sendMessage({
        role: "user" as const,
        parts: [{ type: "text", text: pending }],
      });
    }
  }, [sendMessage]);

  useEffect(() => {
    if (chatData?.hasEmail || sessionData?.hasEmail) {
      setHasEmailCaptured(true);
      setShowEmailGate(false);
    }
  }, [chatData?.hasEmail, sessionData?.hasEmail]);

  const loadedChatIds = useRef(new Set<string>());

  if (isNewChat && !loadedChatIds.current.has(newChatIdRef.current)) {
    loadedChatIds.current.add(newChatIdRef.current);
  }

  useEffect(() => {
    if (!isClientGeneratedChat) {
      setClientChatSaved(false);
      return;
    }
    if (messages.length > 0 && (status === "ready" || status === "error")) {
      setClientChatSaved(true);
    }
  }, [status, isClientGeneratedChat, messages.length]);

  useEffect(() => {
    if (loadedChatIds.current.has(chatId)) {
      return;
    }
    if (chatData?.messages) {
      loadedChatIds.current.add(chatId);
      setMessages(chatData.messages);
    }
  }, [chatId, chatData?.messages, setMessages]);

  const prevChatIdRef = useRef(chatId);
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      setShowEmailGate(false);
      pendingMessageRef.current = null;
      if (isNewChat) {
        setMessages([]);
      }
    }
  }, [chatId, isNewChat, setMessages]);

  useEffect(() => {
    if (chatData && !isNewChat) {
      const cookieModel = document.cookie
        .split("; ")
        .find((row) => row.startsWith("chat-model="))
        ?.split("=")[1];
      if (cookieModel) {
        setCurrentModelId(decodeURIComponent(cookieModel));
      }
    }
  }, [chatData, isNewChat]);

  const hasAppendedQueryRef = useRef(false);

  useEffect(() => {
    if (!shouldFetchMessages) {
      setLatchedInaccessibleId(null);
      return;
    }
    if (chatData) {
      setLatchedInaccessibleId(null);
      return;
    }
    if (chatError && !isLoading) {
      setLatchedInaccessibleId(chatId);
    }
  }, [shouldFetchMessages, chatData, chatError, isLoading, chatId]);

  const isReadonly = shouldFetchMessages
    ? (chatData?.isReadonly ?? false)
    : false;
  const isChatInaccessible =
    shouldFetchMessages && latchedInaccessibleId === chatId;
  const canShowComposer = !isReadonly && (!shouldFetchMessages || !!chatData);

  useEffect(() => {
    if (isChatInaccessible) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const query = params.get("query");
    if (query && !hasAppendedQueryRef.current) {
      hasAppendedQueryRef.current = true;
      window.history.replaceState(
        {},
        "",
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${chatId}`
      );
      sendMessage({
        role: "user" as const,
        parts: [{ type: "text", text: query }],
      });
    }
  }, [sendMessage, chatId, isChatInaccessible]);

  useAutoResume({
    autoResume: shouldFetchMessages && !!chatData,
    initialMessages,
    resumeStream,
    setMessages,
  });

  const { data: votes } = useSWR<Vote[]>(
    !isReadonly && messages.length >= 2
      ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/vote?chatId=${chatId}`
      : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const value = useMemo<ActiveChatContextValue>(
    () => ({
      chatId,
      messages,
      setMessages,
      sendMessage,
      status,
      stop,
      regenerate,
      addToolApprovalResponse,
      input,
      setInput,
      visibilityType: visibility,
      isReadonly,
      isChatInaccessible,
      canShowComposer,
      isLoading: shouldFetchMessages && isLoading,
      votes,
      currentModelId,
      setCurrentModelId,
      showCreditCardAlert,
      setShowCreditCardAlert,
      showEmailGate,
      hasEmailCaptured,
      onEmailCaptured,
    }),
    [
      chatId,
      messages,
      setMessages,
      sendMessage,
      status,
      stop,
      regenerate,
      addToolApprovalResponse,
      input,
      visibility,
      isReadonly,
      isChatInaccessible,
      canShowComposer,
      shouldFetchMessages,
      isLoading,
      votes,
      currentModelId,
      showCreditCardAlert,
      showEmailGate,
      hasEmailCaptured,
      onEmailCaptured,
    ]
  );

  return (
    <ActiveChatContext.Provider value={value}>
      {children}
    </ActiveChatContext.Provider>
  );
}

export function useActiveChat() {
  const context = useContext(ActiveChatContext);
  if (!context) {
    throw new Error("useActiveChat must be used within ActiveChatProvider");
  }
  return context;
}
