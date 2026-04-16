"use client";

import type { ComponentPropsWithoutRef, TextareaHTMLAttributes } from "react";
import { createContext, forwardRef, useContext } from "react";
import { cn } from "@/lib/utils";

const PromptInputContext = createContext<{ onSubmit?: () => void }>({});

type PromptInputProps = ComponentPropsWithoutRef<"div"> & {
  onSubmit?: () => void;
};

export function PromptInput({ children, className, onSubmit, ...props }: PromptInputProps) {
  return (
    <PromptInputContext.Provider value={{ onSubmit }}>
      <div className={cn("w-full", className)} {...props}>
        <div className="flex flex-col">
          {children}
        </div>
      </div>
    </PromptInputContext.Provider>
  );
}

export const PromptInputTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function PromptInputTextarea({ className, onKeyDown, ...props }, ref) {
  const { onSubmit } = useContext(PromptInputContext);

  return (
    <textarea
      className={cn(
        "w-full resize-none bg-transparent outline-none",
        className
      )}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !e.defaultPrevented) {
          e.preventDefault();
          onSubmit?.();
        }
      }}
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
  const { onSubmit } = useContext(PromptInputContext);

  return (
    <button
      className={cn("flex cursor-pointer items-center justify-center", className)}
      onClick={(e) => {
        props.onClick?.(e);
        if (!e.defaultPrevented && !props.disabled) {
          onSubmit?.();
        }
      }}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
