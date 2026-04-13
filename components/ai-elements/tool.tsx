"use client";

import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type ToolProps = ComponentPropsWithoutRef<"div"> & {
  defaultOpen?: boolean;
};

export function Tool({ children, className, defaultOpen: _defaultOpen, ...props }: ToolProps) {
  return (
    <div className={cn("rounded-lg border border-border/50 bg-muted/30 overflow-hidden", className)} {...props}>
      {children}
    </div>
  );
}

type ToolHeaderProps = ComponentPropsWithoutRef<"div"> & {
  state?: string;
  type?: string;
};

export function ToolHeader({ children, className, state: _state, type: _type, ...props }: ToolHeaderProps) {
  return (
    <div className={cn("flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground border-b border-border/50", className)} {...props}>
      {children}
    </div>
  );
}

export function ToolContent({ children, className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("p-3", className)} {...props}>
      {children}
    </div>
  );
}

type ToolInputProps = ComponentPropsWithoutRef<"div"> & {
  input?: unknown;
};

export function ToolInput({ children, className, input, ...props }: ToolInputProps) {
  return (
    <div className={cn("px-3 py-2 text-xs font-mono text-muted-foreground", className)} {...props}>
      {children ?? (input !== undefined ? JSON.stringify(input, null, 2) : null)}
    </div>
  );
}

type ToolOutputProps = ComponentPropsWithoutRef<"div"> & {
  output?: unknown;
  errorText?: string;
};

export function ToolOutput({ children, className, output, errorText, ...props }: ToolOutputProps) {
  return (
    <div className={cn("px-3 py-2 text-xs font-mono", className)} {...props}>
      {children ?? errorText ?? (output !== undefined ? JSON.stringify(output, null, 2) : null)}
    </div>
  );
}
