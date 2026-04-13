import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/chat/artifact";

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

// Stub tool types — actual tool implementations removed
const stubTool = z.object({}).passthrough();
type StubTool = InferUITool<{
  inputSchema: typeof stubTool;
  execute: () => Promise<unknown>;
}>;

export type ChatTools = {
  getWeather: StubTool;
  createDocument: StubTool;
  updateDocument: StubTool;
  requestSuggestions: StubTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  "chat-title": string;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};
