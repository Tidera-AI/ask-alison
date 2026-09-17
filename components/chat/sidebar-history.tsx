"use client";

import { motion } from "framer-motion";
import { Trash2Icon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import useSWRInfinite, { unstable_serialize } from "swr/infinite";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import { ChatbotError } from "@/lib/errors";
import { fetcher, fetchWithErrorHandlers } from "@/lib/utils";

type Chat = {
  id: string;
  title: string;
  createdAt: string | Date;
  visibility: "private" | "public";
};

import { LoaderIcon } from "./icons";
import { ChatItem } from "./sidebar-history-item";

export type ChatHistory = {
  chats: Chat[];
  hasMore: boolean;
};

const PAGE_SIZE = 20;

export function getChatHistoryPaginationKey(
  pageIndex: number,
  previousPageData: ChatHistory
) {
  if (previousPageData && previousPageData.hasMore === false) {
    return null;
  }

  if (pageIndex === 0) {
    return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/history?limit=${PAGE_SIZE}`;
  }

  const firstChatFromPage = previousPageData.chats.at(-1);

  if (!firstChatFromPage) {
    return null;
  }

  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/history?ending_before=${firstChatFromPage.id}&limit=${PAGE_SIZE}`;
}

async function removeChatFromHistoryCache(
  globalMutate: ReturnType<typeof useSWRConfig>["mutate"],
  chatId: string
) {
  const historyKey = unstable_serialize(getChatHistoryPaginationKey);
  await globalMutate(
    historyKey,
    (pages: ChatHistory[] | undefined) => {
      if (!pages) {
        return pages;
      }
      return pages.map((page) => ({
        ...page,
        chats: page.chats.filter((chat) => chat.id !== chatId),
      }));
    },
    { revalidate: false }
  );
}

export async function deleteChatFromHistory(
  globalMutate: ReturnType<typeof useSWRConfig>["mutate"],
  chatId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const url = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chat?id=${chatId}`;

  try {
    await fetchWithErrorHandlers(url, { method: "DELETE" });
  } catch (error) {
    if (error instanceof ChatbotError && error.type === "not_found") {
      await removeChatFromHistoryCache(globalMutate, chatId);
      return { ok: false, message: "Chat not found." };
    }
    if (error instanceof ChatbotError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "Failed to delete chat." };
  }

  await removeChatFromHistoryCache(globalMutate, chatId);
  return { ok: true };
}

/** Indent + width of the recent list, per the design's 32px inset. */
const LIST_GROUP_CLASSES =
  "px-6 pt-2 pb-0 pl-14 group-data-[collapsible=icon]:hidden";

export function SidebarHistory() {
  const { setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const id = pathname?.startsWith("/chat/") ? pathname.split("/")[2] : null;

  const {
    data: paginatedChatHistories,
    setSize,
    isValidating,
    isLoading,
  } = useSWRInfinite<ChatHistory>(getChatHistoryPaginationKey, fetcher, {
    fallbackData: [],
    revalidateOnFocus: false,
  });

  const { mutate: globalMutate } = useSWRConfig();
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  const hasReachedEnd = paginatedChatHistories
    ? paginatedChatHistories.some((page) => page.hasMore === false)
    : false;

  const hasEmptyChatHistory = paginatedChatHistories
    ? paginatedChatHistories.every((page) => page.chats.length === 0)
    : false;

  const chatsFromHistory = paginatedChatHistories
    ? paginatedChatHistories.flatMap((page) => page.chats)
    : [];

  const handleDelete = async () => {
    const chatToDelete = deleteId;
    if (!chatToDelete) {
      return;
    }

    const isCurrentChat = pathname === `/chat/${chatToDelete}`;

    setShowDeleteDialog(false);
    setDeleteId(null);

    const result = await deleteChatFromHistory(globalMutate, chatToDelete);
    if (result.ok) {
      if (isCurrentChat) {
        router.replace("/");
      }
      toast.success("Chat deleted");
    } else {
      toast.error(result.message);
    }
  };

  const handleDeleteAll = () => {
    setShowDeleteAllDialog(false);
    router.replace("/");
    globalMutate(unstable_serialize(getChatHistoryPaginationKey), [], {
      revalidate: false,
    });

    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/history`, {
      method: "DELETE",
    });

    toast.success("All chats deleted");
  };

  if (isLoading) {
    return (
      <SidebarGroup className={LIST_GROUP_CLASSES}>
        <SidebarGroupContent>
          <div className="flex flex-col gap-0.5">
            {[44, 32, 28, 64, 52].map((item) => (
              <div
                className="flex h-[35px] items-center gap-2.5 px-3"
                key={item}
              >
                <div
                  className="h-3 max-w-(--skeleton-width) flex-1 animate-pulse rounded-md bg-sidebar-foreground/[0.06]"
                  style={
                    {
                      "--skeleton-width": `${item}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (hasEmptyChatHistory) {
    return (
      <SidebarGroup className={LIST_GROUP_CLASSES}>
        <SidebarGroupContent>
          <p className="px-3 py-2 text-[13px] text-sidebar-foreground/60">
            Your conversations will appear here once you start chatting!
          </p>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <>
      <SidebarGroup className={LIST_GROUP_CLASSES}>
        <SidebarGroupContent className="flex flex-col gap-2">
          <SidebarMenu className="gap-0.5">
            {chatsFromHistory.map((chat) => (
              <ChatItem
                chat={chat}
                isActive={chat.id === id}
                key={chat.id}
                onDelete={(chatId) => {
                  setDeleteId(chatId);
                  setShowDeleteDialog(true);
                }}
                setOpenMobile={setOpenMobile}
              />
            ))}
          </SidebarMenu>

          <motion.div
            onViewportEnter={() => {
              if (!isValidating && !hasReachedEnd) {
                setSize((size) => size + 1);
              }
            }}
          />

          {hasReachedEnd ? (
            <button
              className="flex w-full cursor-pointer items-center justify-between text-sidebar-foreground/70 transition-colors duration-150 hover:text-destructive"
              onClick={() => setShowDeleteAllDialog(true)}
              type="button"
            >
              <span className="px-3 text-button">Delete all</span>
              <Trash2Icon className="size-3" />
            </button>
          ) : (
            <div className="mt-1 flex flex-row items-center gap-2 px-3 py-2 text-sidebar-foreground/50">
              <div className="animate-spin">
                <LoaderIcon />
              </div>
              <div className="text-[11px]">Loading...</div>
            </div>
          )}
        </SidebarGroupContent>
      </SidebarGroup>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              chat and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        onOpenChange={setShowDeleteAllDialog}
        open={showDeleteAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all
              your chats and remove them from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}>
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
