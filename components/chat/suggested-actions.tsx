"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { memo } from "react";
import { suggestions } from "@/lib/constants";
import type { ChatMessage } from "@/lib/types";
import { Suggestion } from "../ai-elements/suggestion";
import type { VisibilityType } from "./visibility-selector";

type SuggestedActionsProps = {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  selectedVisibilityType: VisibilityType;
};

function PureSuggestedActions({ chatId, sendMessage }: SuggestedActionsProps) {
  const suggestedActions = suggestions;

  return (
    <div
      className="grid w-full grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2"
      data-testid="suggested-actions"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <Suggestion
          className="fade-up flex h-[45px] w-full cursor-pointer items-center gap-3 rounded-md border border-border bg-card px-3 text-left text-[14px] text-muted-foreground transition-colors duration-200 hover:border-ee-dusty-pink hover:bg-ee-pearl-pink hover:text-foreground"
          key={suggestedAction}
          onClick={(suggestion) => {
            window.history.pushState(
              {},
              "",
              `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${chatId}`
            );
            sendMessage({
              role: "user",
              parts: [{ type: "text", text: suggestion }],
            });
          }}
          style={{ animationDelay: `${(index + 4) * 80}ms` }}
          suggestion={suggestedAction}
        >
          <span
            aria-hidden="true"
            className="size-[5px] shrink-0 rounded-full bg-ee-wisis-pink"
          />
          <span className="min-w-0 truncate">{suggestedAction}</span>
        </Suggestion>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }

    return true;
  }
);
