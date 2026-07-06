"use client";

import { motion } from "framer-motion";
import { PenSquareIcon } from "lucide-react";
import Link from "next/link";

export function ChatInaccessible() {
  return (
    <div className="flex flex-col items-center px-4">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="text-center font-serif font-light text-2xl tracking-tight text-foreground sm:text-3xl md:text-4xl"
        initial={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        This chat is private
      </motion.div>
      <motion.p
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 max-w-md text-center text-sm leading-relaxed text-muted-foreground sm:mt-3"
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        Ask the owner to set it to public if you&apos;d like to view it.
      </motion.p>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <Link
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg border border-sidebar-border px-3 text-[13px] text-sidebar-foreground transition-colors duration-150 hover:bg-sidebar-accent/50"
          href="/"
        >
          <PenSquareIcon className="size-5 shrink-0" />
          <span className="font-medium">New chat</span>
        </Link>
      </motion.div>
    </div>
  );
}
