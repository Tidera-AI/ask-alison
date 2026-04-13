"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ModelSelectorProps = ComponentPropsWithoutRef<"div"> & {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ModelSelector({ children, className, open: _open, onOpenChange: _onOpenChange, ...props }: ModelSelectorProps) {
  return (
    <div className={cn("relative", className)} {...props}>
      {children}
    </div>
  );
}

type ModelSelectorTriggerProps = ComponentPropsWithoutRef<"button"> & {
  asChild?: boolean;
};

export function ModelSelectorTrigger({ children, className, asChild: _asChild, ...props }: ModelSelectorTriggerProps) {
  return (
    <button className={cn("flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors", className)} type="button" {...props}>
      {children}
    </button>
  );
}

export function ModelSelectorContent({ children, className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("absolute bottom-full mb-1 z-50 w-64 rounded-lg border border-border/50 bg-card shadow-lg", className)} {...props}>
      {children}
    </div>
  );
}

export function ModelSelectorInput({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return (
    <input
      className={cn("w-full border-b border-border/50 bg-transparent px-3 py-2 text-xs outline-none placeholder:text-muted-foreground/50", className)}
      {...props}
    />
  );
}

export function ModelSelectorList({ children, className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("max-h-48 overflow-y-auto py-1", className)} {...props}>
      {children}
    </div>
  );
}

type ModelSelectorGroupProps = ComponentPropsWithoutRef<"div"> & {
  heading?: string;
};

export function ModelSelectorGroup({ children, className, heading, ...props }: ModelSelectorGroupProps) {
  return (
    <div className={cn("py-1", className)} {...props}>
      {heading && (
        <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {heading}
        </div>
      )}
      {children}
    </div>
  );
}

type ModelSelectorItemProps = ComponentPropsWithoutRef<"button"> & {
  value?: string;
  onSelect?: (value: string) => void;
};

export function ModelSelectorItem({ children, className, value, onSelect, onClick, ...props }: ModelSelectorItemProps) {
  return (
    <button
      className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent/50 transition-colors", className)}
      onClick={(e) => {
        onClick?.(e);
        if (value) onSelect?.(value);
      }}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

type ModelSelectorLogoProps = {
  provider: string;
  className?: string;
};

export function ModelSelectorLogo({ provider, className }: ModelSelectorLogoProps) {
  return (
    <div className={cn("size-4 shrink-0 rounded-sm bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground", className)}>
      {provider.charAt(0).toUpperCase()}
    </div>
  );
}

export function ModelSelectorName({ children, className, ...props }: ComponentPropsWithoutRef<"span">) {
  return (
    <span className={cn("truncate", className)} {...props}>
      {children}
    </span>
  );
}
