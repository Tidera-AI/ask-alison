"use client";

import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type ReasoningProps = ComponentPropsWithoutRef<"div"> & {
  defaultOpen?: boolean;
  isStreaming?: boolean;
};

export function Reasoning({ children, className, defaultOpen: _defaultOpen, isStreaming: _isStreaming, ...props }: ReasoningProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)} {...props}>
      {children}
    </div>
  );
}

export function ReasoningTrigger({ children, className, ...props }: ComponentPropsWithoutRef<"button">) {
  return (
    <button className={cn("flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors", className)} type="button" {...props}>
      {children}
    </button>
  );
}

export function ReasoningContent({ children, className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("text-xs text-muted-foreground leading-relaxed", className)} {...props}>
      {children}
    </div>
  );
}
