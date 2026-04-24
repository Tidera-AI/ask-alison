import { gateway } from "ai";

function assertAiGatewayAuthConfigured() {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  const oidcToken =
    process.env.VERCEL_OIDC_TOKEN ?? process.env.VERCEL_OIDC_TOKEN_VALUE;

  if (apiKey || oidcToken) {
    return;
  }

  throw new Error(
    [
      "AI Gateway authentication is not configured.",
      "",
      "Option 1 - API key:",
      "Set AI_GATEWAY_API_KEY in your environment (recommended for local dev).",
      "",
      "Option 2 - OIDC token (Vercel):",
      "Run `npx vercel link` then `vc env pull` to provision the token.",
    ].join("\n")
  );
}

export function getLanguageModel(modelId: string) {
  assertAiGatewayAuthConfigured();
  return gateway.languageModel(modelId);
}

export function getTitleModel() {
  assertAiGatewayAuthConfigured();
  return gateway.languageModel("anthropic/claude-haiku-4.5");
}
