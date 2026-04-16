"use client";

import type { ComponentPropsWithoutRef } from "react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

export function MessageResponse({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div"> & { children: string }) {
  return (
    <div className={cn("prose prose-sm max-w-none dark:prose-invert", className)} {...props}>
      <Streamdown>{children}</Streamdown>
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
