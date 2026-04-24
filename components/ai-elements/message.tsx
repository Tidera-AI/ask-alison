"use client";

import type { ComponentPropsWithoutRef } from "react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

function linkifyPlainText(input: string): string {
  // Avoid linkifying inside code or existing markdown links.
  const protectedTokenRegex = /```[\s\S]*?```|`[^`]*`|\[[^\]]+]\([^)]+\)/g;
  const parts: Array<{ type: "code" | "text"; value: string }> = [];

  let lastIndex = 0;
  for (const match of input.matchAll(protectedTokenRegex)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: "text", value: input.slice(lastIndex, index) });
    }
    parts.push({ type: "code", value: match[0] ?? "" });
    lastIndex = index + (match[0]?.length ?? 0);
  }
  if (lastIndex < input.length) {
    parts.push({ type: "text", value: input.slice(lastIndex) });
  }

  const linkified = parts
    .map((part) => {
      if (part.type === "code") {
        return part.value;
      }

      // Linkify bare domains (e.g., elevateetiquette.com/path).
      // Full URLs (https://...) are typically auto-linked by the renderer already.
      return part.value.replaceAll(
        /(^|[\s("'*_~])((?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+)(\/[^\s<>()\]]*)?/gi,
        (_match, prefix: string, domain: string, path: string | undefined) => {
          const display = `${domain}${path ?? ""}`;
          const href = `https://${display}`;
          return `${prefix}[${display}](${href})`;
        }
      );
    })
    .join("");

  return linkified;
}

export function MessageResponse({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div"> & { children: string }) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert prose-a:text-primary prose-a:underline prose-a:underline-offset-2 prose-a:decoration-primary/60 hover:prose-a:decoration-primary",
        className
      )}
      {...props}
    >
      <Streamdown linkSafety={{ enabled: false }}>
        {linkifyPlainText(children)}
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
