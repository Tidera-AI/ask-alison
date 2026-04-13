"use client";

import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type SuggestionProps = Omit<ComponentPropsWithoutRef<"button">, "onClick"> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
};

export function Suggestion({ suggestion, onClick, children, className, ...props }: SuggestionProps) {
  return (
    <button
      className={cn("text-left", className)}
      onClick={() => onClick?.(suggestion)}
      type="button"
      {...props}
    >
      {children ?? suggestion}
    </button>
  );
}
