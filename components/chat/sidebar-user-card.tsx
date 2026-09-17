"use client";

import { ChevronDownIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import useSWR from "swr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetcher } from "@/lib/utils";

type SessionResponse = {
  hasEmail: boolean;
  email: string | null;
};

/**
 * Footer identity card. The app has no accounts — the only thing we ever know
 * about a visitor is the email captured by the gate, so the card stays hidden
 * until then and the avatar is just that address's first letter.
 */
export function SidebarUserCard() {
  const { setTheme } = useTheme();
  // Same SWR key as `use-active-chat`, so this shares that cache rather than
  // issuing a second request.
  const { data } = useSWR<SessionResponse>(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/session`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const email = data?.email;

  if (!email) {
    return null;
  }

  const initial = email.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar p-3 text-left transition-colors duration-150 hover:bg-sidebar-accent/50"
          type="button"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-sidebar-border bg-background font-semibold text-[13px] text-muted-foreground">
            {initial}
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
            {email}
          </span>
          <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" side="top">
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => setTheme("light")}
        >
          <SunIcon className="mr-2 size-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => setTheme("dark")}
        >
          <MoonIcon className="mr-2 size-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => setTheme("system")}
        >
          <MonitorIcon className="mr-2 size-4" />
          System
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-default text-muted-foreground text-xs focus:bg-transparent">
          Signed in for transcripts
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
