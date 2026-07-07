"use client";

import { useEffect, useRef, useState } from "react";
import { MessageResponse } from "@/components/ai-elements/message";
import type { ChatSource } from "@/lib/rag/format";

/**
 * Smooths bursty React/stream updates without delaying content that is already
 * available. Large jumps are spread across a few frames; small deltas render
 * immediately so we never artificially slow the model below its actual pace.
 */
const IMMEDIATE_REVEAL_THRESHOLD = 8;
/** Target frames to spread a large buffered jump over (~8 frames ≈ 130ms at 60fps). */
const BURST_SPREAD_FRAMES = 8;

export function StreamingTextReveal({
  text,
  isStreaming,
  sources,
  className,
}: {
  text: string;
  isStreaming: boolean;
  sources?: ChatSource[];
  className?: string;
}) {
  const [visibleCount, setVisibleCount] = useState(() =>
    isStreaming ? 0 : text.length
  );
  const visibleCountRef = useRef(visibleCount);
  visibleCountRef.current = visibleCount;
  const textRef = useRef(text);
  textRef.current = text;

  useEffect(() => {
    if (!isStreaming) {
      setVisibleCount(text.length);
    }
  }, [isStreaming, text.length]);

  useEffect(() => {
    if (!isStreaming) {
      return;
    }

    let frameId = 0;

    const tick = () => {
      const fullText = textRef.current;
      const current = visibleCountRef.current;
      const behind = fullText.length - current;

      if (behind > 0) {
        if (behind <= IMMEDIATE_REVEAL_THRESHOLD) {
          setVisibleCount(fullText.length);
        } else {
          const charsPerFrame = Math.max(
            1,
            Math.ceil(behind / BURST_SPREAD_FRAMES)
          );
          setVisibleCount(Math.min(fullText.length, current + charsPerFrame));
        }
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isStreaming]);

  const visibleText = text.slice(0, visibleCount);
  const isAnimating = isStreaming || visibleCount < text.length;

  return (
    <MessageResponse
      className={className}
      isStreaming={isAnimating}
      sources={sources}
    >
      {visibleText}
    </MessageResponse>
  );
}
