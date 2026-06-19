import { gateway } from "ai";

export function getLanguageModel(modelId: string) {
  return gateway.languageModel(modelId);
}

export function getTitleModel() {
  return gateway.languageModel("anthropic/claude-haiku-4.5");
}

// Cheap model used for off-path response grading (faithfulness/relevance).
export const EVAL_MODEL_ID = "anthropic/claude-haiku-4.5";

export function getEvalModel() {
  return gateway.languageModel(EVAL_MODEL_ID);
}
