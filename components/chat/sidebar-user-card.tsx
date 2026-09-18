"use client";

import {
  ChevronDownIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
  UserIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import useSWR from "swr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetcher } from "@/lib/utils";

type SessionResponse = {
  hasEmail: boolean;
  email: string | null;
};

export function SidebarUserCard() {
  const { setTheme } = useTheme();
  // Same key as `use-active-chat`, so this shares its cache.
  const { data } = useSWR<SessionResponse>(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/session`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const email = data?.email ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex w-full cursor-pointer items-center gap-3 rounded-[12px] border border-sidebar-border bg-sidebar p-3 text-left transition-colors duration-150 hover:bg-sidebar-accent/50"
          type="button"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-sidebar-border bg-background font-semibold text-[13px] text-muted-foreground">
            {email ? (
              email.charAt(0).toUpperCase()
            ) : (
              <UserIcon className="size-4" />
            )}
          </span>
          <span className="min-w-0 flex-1 truncate font-medium text-[14px] text-sidebar-foreground">
            {email ?? "Guest"}
          </span>
          <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" side="top">
        <DropdownMenuLabel className="font-normal text-muted-foreground text-xs">
          {email ?? "Your transcript is emailed once you share an address"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
