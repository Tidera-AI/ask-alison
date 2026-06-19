"use client";

import { BookIcon } from "lucide-react";
import type { ComponentProps } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { buildSourceIndex, resolveCitation } from "@/lib/markdown/citations";
import type { ChatSource } from "@/lib/rag/format";
import { cn, safeExternalUrl } from "@/lib/utils";

interface CitationMarkerProps {
  index: number;
  source: ChatSource;
}

// A single inline `[n]` citation: a small superscript badge that reveals the
// underlying source on hover. Book sources have no URL, so the trigger is only
// a link when one is available.
function CitationMarker({ index, source }: CitationMarkerProps) {
  const href = safeExternalUrl(source.url);
  const trigger = (
    <sup
      className={cn(
        "ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full",
        "bg-primary/10 px-1 align-super font-medium text-[10px] text-primary",
        "ring-1 ring-primary/20 transition-colors hover:bg-primary/20"
      )}
    >
      {index}
    </sup>
  );

  return (
    <HoverCard closeDelay={80} openDelay={80}>
      <HoverCardTrigger asChild>
        {href ? (
          <a href={href} rel="noreferrer" target="_blank">
            {trigger}
          </a>
        ) : (
          <button className="cursor-default" type="button">
            {trigger}
          </button>
        )}
      </HoverCardTrigger>
      <HoverCardContent className="w-72 p-3">
        <div className="flex items-start gap-2">
          <BookIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0 space-y-1">
            <p className="font-medium text-xs leading-snug">{source.label}</p>
            {href ? (
              <a
                className="text-muted-foreground text-xs underline underline-offset-2 hover:text-foreground"
                href={href}
                rel="noreferrer"
                target="_blank"
              >
                Open source
              </a>
            ) : null}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

// react-markdown / Streamdown passes the original hast node so we can read the
// `data-index` property the rehype plugin attached.
type CiteNode = { properties?: { dataIndex?: string | number } };
type CiteProps = ComponentProps<"cite"> & { node?: CiteNode };

// Build the `components` map that Streamdown uses to render <cite> elements
// produced by rehypeInlineCitations. Unknown indices fall back to the literal
// marker text so a hallucinated [9] never throws.
export function createCitationComponents(sources: ChatSource[]) {
  const byIndex = buildSourceIndex(sources);

  return {
    cite: ({ node, children }: CiteProps) => {
      const resolved = resolveCitation(byIndex, node?.properties?.dataIndex);
      if (!resolved) {
        return <>{children}</>;
      }
      return <CitationMarker index={resolved.index} source={resolved.source} />;
    },
  };
}
