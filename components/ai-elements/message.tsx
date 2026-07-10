"use client";

import type { ComponentPropsWithoutRef } from "react";
import { defaultRehypePlugins, Streamdown } from "streamdown";
import { createCitationComponents } from "@/components/chat/citation-marker";
import { renderLinkSafetyModal } from "@/components/chat/link-safety-modal";
import type { ChatSource } from "@/lib/rag/format";
import { rehypeInlineCitations } from "@/lib/markdown/rehype-inline-citations";
import { cn } from "@/lib/utils";

const linkSafety = {
  enabled: true,
  renderModal: renderLinkSafetyModal,
} as const;

export function MessageResponse({
  children,
  className,
  sources,
  isStreaming = false,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  children: string;
  sources?: ChatSource[];
  isStreaming?: boolean;
}) {
  // Only enable inline-citation rendering when the message has sources to
  // point at; otherwise leave Streamdown's defaults completely untouched.
  const hasSources = Boolean(sources && sources.length > 0);
  const rehypePlugins = hasSources
    ? [...Object.values(defaultRehypePlugins), rehypeInlineCitations]
    : undefined;
  const components = hasSources
    ? createCitationComponents(sources as ChatSource[])
    : undefined;

  return (
    <div className={cn("prose prose-sm max-w-none dark:prose-invert", className)} {...props}>
      <Streamdown
        caret={isStreaming ? "circle" : undefined}
        components={components}
        isAnimating={isStreaming}
        linkSafety={linkSafety}
        mode={isStreaming ? "streaming" : "static"}
        parseIncompleteMarkdown={isStreaming}
        rehypePlugins={rehypePlugins}
      >
        {children}
      </Streamdown>
    </div>
  );
}

export function MessageContent({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      {children}
    </div>
  );
}

export function MessageAction({
  children,
  className,
  tooltip: _tooltip,
  ...props
}: ComponentPropsWithoutRef<"button"> & { tooltip?: string }) {
  return (
    <button className={cn("flex cursor-pointer items-center justify-center rounded-md p-1", className)} type="button" {...props}>
      {children}
    </button>
  );
}

export function MessageActions({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("flex items-center gap-0.5", className)} {...props}>
      {children}
    </div>
  );
}
