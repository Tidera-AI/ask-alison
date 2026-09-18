"use client";

import { BookmarkIcon, PanelLeftIcon, PenSquareIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Monogram } from "@/components/brand/monogram";
import { SidebarHistory } from "@/components/chat/sidebar-history";
import { SidebarUserCard } from "@/components/chat/sidebar-user-card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export function AppSidebar() {
  const router = useRouter();
  const { setOpenMobile, toggleSidebar } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-4 px-6 pt-8 pb-0 group-data-[collapsible=icon]:px-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex flex-row items-center justify-between">
            <div className="group/logo relative flex items-center justify-center">
              <SidebarMenuButton
                asChild
                className="size-13 !px-0 items-center justify-center group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:group-hover/logo:opacity-0"
                tooltip="Ask Alison"
              >
                <Link href="/" onClick={() => setOpenMobile(false)}>
                  {/* `!`: the vendored sidebar's `[&_svg]:size-5` otherwise wins. */}
                  <Monogram className="size-13! text-primary group-data-[collapsible=icon]:size-8!" />
                </Link>
              </SidebarMenuButton>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton
                    className="pointer-events-none absolute inset-0 size-10 opacity-0 group-data-[collapsible=icon]:pointer-events-auto group-data-[collapsible=icon]:group-hover/logo:opacity-100"
                    onClick={() => toggleSidebar()}
                  >
                    <PanelLeftIcon className="size-5" />
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent className="hidden md:block" side="right">
                  Open sidebar
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
              <ThemeToggle />
              <SidebarTrigger className="text-sidebar-foreground/60 transition-colors duration-150 hover:text-sidebar-foreground" />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>

        <h1 className="px-1 font-light font-serif text-[36px] text-sidebar-foreground leading-none tracking-[-0.96px] group-data-[collapsible=icon]:hidden">
          Ask Alison
        </h1>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <SidebarGroup className="px-6 pt-6 pb-0 group-data-[collapsible=icon]:px-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="h-10 gap-3 rounded-[8px] px-3 font-semibold text-[14px] text-sidebar-foreground"
                  onClick={() => {
                    setOpenMobile(false);
                    router.push("/");
                  }}
                  tooltip="New Chat"
                >
                  <PenSquareIcon className="size-[18px] text-ee-wisis-pink" />
                  <span>New Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <div className="flex h-10 items-center gap-3 rounded-[8px] px-3 font-medium text-[14px] text-muted-foreground group-data-[collapsible=icon]:hidden">
                  <BookmarkIcon className="size-[18px] shrink-0 text-ee-wisis-pink" />
                  <span>Recent Queries</span>
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarHistory />
      </SidebarContent>

      <SidebarFooter className="px-6 pb-8 group-data-[collapsible=icon]:hidden">
        <SidebarUserCard />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
