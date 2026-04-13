"use client";

import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type ShimmerProps = ComponentPropsWithoutRef<"span"> & {
  duration?: number;
};

export function Shimmer({
  children,
  className,
  duration: _duration,
  ...props
}: ShimmerProps) {
  return (
    <span
      className={cn("animate-pulse text-muted-foreground/60", className)}
      {...props}
    >
      {children}
    </span>
  );
}
