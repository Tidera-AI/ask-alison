import type {
  UIMessage,
} from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChatbotError, type ErrorCode } from './errors';
import type { Document } from './db/schema';
import type { ChatMessage } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    try {
      const { code, cause } = await response.json();
      throw new ChatbotError(code as ErrorCode, cause);
    } catch (e) {
      if (e instanceof ChatbotError) {
        throw e;
      }
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }
  }

  return response.json();
};

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    const response = await fetch(input, init);

    if (!response.ok) {
      try {
        const { code, cause } = await response.json();
        throw new ChatbotError(code as ErrorCode, cause);
      } catch (e) {
        if (e instanceof ChatbotError) {
          throw e;
        }
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }
    }

    return response;
  } catch (error: unknown) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ChatbotError('offline:chat');
    }

    throw error;
  }
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getDocumentTimestampByIndex(
  documents: Document[],
  index: number,
) {
  if (!documents) { return new Date(); }
  if (index > documents.length) { return new Date(); }

  return documents[index].createdAt;
}

export function sanitizeText(text: string) {
  return text.replace('<has_function_call>', '');
}

// Only allow http(s) URLs to be used as link targets. Source URLs come from the
// trusted ingestion table, but this guards against a stored `javascript:` (or
// other scheme) href slipping through into a hand-rendered anchor.
export function safeExternalUrl(
  url: string | null | undefined
): string | undefined {
  if (!url) {
    return undefined;
  }
  try {
    const parsed = new URL(url, 'https://example.com');
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? url
      : undefined;
  } catch {
    return undefined;
  }
}

export function getTextFromMessage(message: ChatMessage | UIMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => (part as { type: 'text'; text: string}).text)
    .join('');
}
