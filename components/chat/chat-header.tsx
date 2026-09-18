"use client";

import { PanelLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

// The mockup has no top bar. Its contents moved into the sidebar: theme sits
// next to the sidebar trigger, per-chat visibility is already in each history
// item's menu. What remains is the mobile-only affordance for opening the
// sidebar sheet, which the rail (`sm:block`) cannot provide.
export function ChatHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-10 flex h-12 items-center bg-sidebar px-3 md:hidden">
      <Button
        aria-label="Open sidebar"
        onClick={toggleSidebar}
        size="icon-sm"
        variant="ghost"
      >
        <PanelLeftIcon className="size-4" />
      </Button>
    </header>
  );
}
