"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import type { ChatMessage } from "@/lib/types";
import { SuggestedActions } from "./suggested-actions";
import type { VisibilityType } from "./visibility-selector";

/**
 * Staggered entrance uses the CSS `fade-up` utility rather than framer-motion
 * on purpose: a JS-driven `initial={{ opacity: 0 }}` leaves the whole hero
 * invisible until hydration finishes, which on a cold dev compile was several
 * seconds of blank screen. CSS animations start at first paint instead.
 */
const stagger = (index: number) => ({
  animationDelay: `${index * 80}ms`,
});

type EmptyStateProps = {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  selectedVisibilityType: VisibilityType;
  /** The composer (or the email gate when it has taken the composer's place). */
  children: ReactNode;
};

/**
 * The landing screen: one centred column in normal document flow.
 *
 * This deliberately replaces the old arrangement, where the greeting was an
 * absolutely-positioned overlay inside the scroll area and the suggestions were
 * children of a sticky composer — those two could never be centred as a single
 * stack.
 */
export function EmptyState({
  chatId,
  sendMessage,
  selectedVisibilityType,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-0 flex-1 touch-pan-y flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[752px] flex-1 flex-col justify-center gap-9 px-4 py-10">
        <div
          // The mockup leaves a deliberately large gap under the wordmark.
          className="mb-4 flex justify-center fade-up sm:mb-[79px]"
          style={stagger(0)}
        >
          <Wordmark className="h-14 w-auto text-foreground sm:h-[68px]" />
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <p
            className="text-eyebrow fade-up text-muted-foreground"
            style={stagger(1)}
          >
            Your AI Etiquette Guide
          </p>
          <h1
            className="fade-up font-light font-serif text-[40px] text-foreground leading-[1.05] tracking-[-0.025em] sm:text-[52px] md:text-[64px]"
            style={stagger(2)}
          >
            Ask Alison
          </h1>
          <p
            className="fade-up text-balance text-[16px] text-muted-foreground sm:text-[18px]"
            style={stagger(3)}
          >
            Here to help you navigate social and professional situations with
            confidence and grace.
          </p>
        </div>

        <SuggestedActions
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
          sendMessage={sendMessage}
        />

        <div className="fade-up" style={stagger(8)}>
          {children}
        </div>
      </div>
    </div>
  );
}
