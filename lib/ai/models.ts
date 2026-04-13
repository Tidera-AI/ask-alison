export interface ChatModel {
  id: string;
  name: string;
  description: string;
  provider?: string;
}

export type ModelCapabilities = {
  vision: boolean;
  reasoning: boolean;
  tools: boolean;
};

export const DEFAULT_CHAT_MODEL_ID = "anthropic/claude-haiku-4.5";

// Alias for backwards compatibility
export const DEFAULT_CHAT_MODEL = DEFAULT_CHAT_MODEL_ID;

export const chatModels: ChatModel[] = [
  {
    id: "anthropic/claude-haiku-4.5",
    name: "Claude Haiku",
    description: "Fast, cost-efficient responses for etiquette questions",
  },
];
