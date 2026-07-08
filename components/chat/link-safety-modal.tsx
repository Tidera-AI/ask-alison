"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { LinkSafetyModalProps } from "streamdown";
import { CopyIcon, GlobeIcon } from "./icons";

let openModalCount = 0;

function lockBodyScroll() {
  openModalCount += 1;
  if (openModalCount === 1) {
    document.body.style.overflow = "hidden";
  }
}

function unlockBodyScroll() {
  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount === 0) {
    document.body.style.overflow = "";
  }
}

function LinkSafetyModalContent({
  isOpen,
  onClose,
  onConfirm,
  url,
}: LinkSafetyModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [url]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    lockBodyScroll();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      unlockBodyScroll();
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm"
      data-streamdown="link-safety-modal"
    >
      <button
        aria-label="Dismiss link safety dialog"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <div
        aria-modal="true"
        className="relative z-10 mx-4 flex w-full max-w-md flex-col gap-4 rounded-xl border bg-background p-6 shadow-lg"
        role="dialog"
      >
        <div className="flex flex-col gap-2 pr-8">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <GlobeIcon />
            <span>Open external link?</span>
          </div>
          <p className="text-muted-foreground text-sm">
            You&apos;re about to visit an external website.
          </p>
        </div>

        <div className="break-all rounded-md bg-muted p-3 font-mono text-sm">
          {url}
        </div>

        <div className="flex gap-2">
          <button
            className="flex flex-1 items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 font-medium text-sm transition-all hover:bg-muted"
            onClick={handleCopy}
            type="button"
          >
            <CopyIcon />
            <span>{copied ? "Copied" : "Copy link"}</span>
          </button>
          <button
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-all hover:bg-primary/90"
            onClick={onConfirm}
            type="button"
          >
            <GlobeIcon />
            <span>Open link</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function renderLinkSafetyModal(props: LinkSafetyModalProps) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(<LinkSafetyModalContent {...props} />, document.body);
}
