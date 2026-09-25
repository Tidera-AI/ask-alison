import { beforeEach, describe, expect, it, vi } from "vitest";

const generateText = vi.fn();
const updateChatTitle = vi.fn();

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateText(...args),
  createUIMessageStream: vi.fn(),
}));
vi.mock("@/lib/ai/providers", () => ({ getTitleModel: () => "title-model" }));
vi.mock("@/lib/ai/prompts", () => ({ titlePrompt: "title prompt" }));
vi.mock("@/lib/db/queries", () => ({
  saveMessage: vi.fn(),
  updateChatTitle: (...args: unknown[]) => updateChatTitle(...args),
}));

const { updateChatTitleBestEffort } = await import("./static-reply");

describe("updateChatTitleBestEffort", () => {
  beforeEach(() => {
    generateText.mockReset();
    updateChatTitle.mockReset().mockResolvedValue(undefined);
  });

  it("saves the generated title", async () => {
    generateText.mockResolvedValue({ text: "  Declining an invitation " });
    await updateChatTitleBestEffort("c1", "How do I decline?");
    expect(updateChatTitle).toHaveBeenCalledWith(
      "c1",
      "Declining an invitation"
    );
  });

  it("keeps the default title and does not throw when the model fails", async () => {
    generateText.mockRejectedValue(new Error("402 insufficient_funds"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(
      updateChatTitleBestEffort("c1", "How do I decline?")
    ).resolves.toBeUndefined();
    expect(updateChatTitle).not.toHaveBeenCalled();
  });

  it("skips the update when the model returns an empty title", async () => {
    generateText.mockResolvedValue({ text: "   " });
    await updateChatTitleBestEffort("c1", "hi");
    expect(updateChatTitle).not.toHaveBeenCalled();
  });

  it("does not throw when saving the title fails", async () => {
    generateText.mockResolvedValue({ text: "Title" });
    updateChatTitle.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(
      updateChatTitleBestEffort("c1", "hi")
    ).resolves.toBeUndefined();
  });
});
