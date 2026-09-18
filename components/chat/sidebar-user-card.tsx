"use client";

import { ChevronDownIcon, UserIcon } from "lucide-react";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";

type SessionResponse = {
  hasEmail: boolean;
  email: string | null;
};

// Static by design: the mockup draws a chevron, but the app has no account, so
// there is nothing behind it yet. Rendered as a div rather than a button so it
// doesn't advertise an action it can't perform.
export function SidebarUserCard() {
  // Same key as `use-active-chat`, so this shares its cache.
  const { data } = useSWR<SessionResponse>(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/session`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const email = data?.email ?? null;

  return (
    <div className="flex w-full items-center gap-3 rounded-[12px] border border-sidebar-border bg-sidebar p-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-sidebar-border bg-background font-semibold text-[13px] text-muted-foreground">
        {email ? (
          email.charAt(0).toUpperCase()
        ) : (
          <UserIcon className="size-4" />
        )}
      </span>
      <span
        className="min-w-0 flex-1 truncate font-medium text-[14px] text-sidebar-foreground"
        title={email ?? undefined}
      >
        {email ?? "Guest"}
      </span>
      <ChevronDownIcon
        aria-hidden="true"
        className="size-3.5 shrink-0 text-muted-foreground/40"
      />
    </div>
  );
}
