"use client";

import type { ComponentPropsWithoutRef, TextareaHTMLAttributes, Ref } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type PromptInputProps = ComponentPropsWithoutRef<"div"> & {
  onSubmit?: () => void;
};

export function PromptInput({ children, className, onSubmit: _onSubmit, ...props }: PromptInputProps) {
  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="flex flex-col">
        {children}
      </div>
    </div>
  );
}

export const PromptInputTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function PromptInputTextarea({ className, ...props }, ref) {
  return (
    <textarea
      className={cn(
        "w-full resize-none bg-transparent outline-none",
        className
      )}
      ref={ref}
      rows={3}
      {...props}
    />
  );
});

export function PromptInputFooter({ children, className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("flex items-center justify-between", className)} {...props}>
      {children}
    </div>
  );
}

export function PromptInputTools({ children, className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("flex items-center gap-1", className)} {...props}>
      {children}
    </div>
  );
}

type PromptInputSubmitProps = ComponentPropsWithoutRef<"button"> & {
  status?: string;
  variant?: string;
};

export function PromptInputSubmit({ children, className, status: _status, variant: _variant, ...props }: PromptInputSubmitProps) {
  return (
    <button
      className={cn("flex items-center justify-center", className)}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
