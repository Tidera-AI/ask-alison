import { beforeEach, describe, expect, it, vi } from "vitest";

const generateText = vi.fn();

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateText(...args),
}));

vi.mock("../ai/providers", () => ({
  getTitleModel: () => "mock-title-model",
}));

import { isRetrievalCertain, shouldSkipRetrieval } from "./pleasantry-classify";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("shouldSkipRetrieval", () => {
  it("skips punctuation-only input without calling the model", async () => {
    expect(await shouldSkipRetrieval(".")).toBe(true);
    expect(await shouldSkipRetrieval("???")).toBe(true);
    expect(generateText).not.toHaveBeenCalled();
  });

  it("skips when the classifier returns GREETING", async () => {
    generateText.mockResolvedValue({ text: "GREETING" });

    expect(await shouldSkipRetrieval("heyyy")).toBe(true);
    expect(await shouldSkipRetrieval("thnks")).toBe(true);
  });

  it("searches when the classifier returns SEARCH", async () => {
    generateText.mockResolvedValue({ text: "SEARCH" });

    expect(await shouldSkipRetrieval("why?")).toBe(false);
  });

  it("searches long messages without calling the model", async () => {
    expect(await shouldSkipRetrieval("thanks for the gift advice")).toBe(false);
    expect(generateText).not.toHaveBeenCalled();
  });

  it("searches when classification fails", async () => {
    generateText.mockRejectedValue(new Error("unavailable"));

    expect(await shouldSkipRetrieval("hi")).toBe(false);
  });
});

describe("isRetrievalCertain", () => {
  it("is certain for long messages that cannot be a pleasantry", () => {
    expect(isRetrievalCertain("thanks for the gift advice")).toBe(true);
    expect(isRetrievalCertain("what should I wear to a wedding")).toBe(true);
  });

  it("is not certain for short inputs that need the classifier", () => {
    expect(isRetrievalCertain("heyyy")).toBe(false);
    expect(isRetrievalCertain("thnks")).toBe(false);
    expect(isRetrievalCertain("why?")).toBe(false);
  });

  it("is not certain for punctuation-only input", () => {
    expect(isRetrievalCertain(".")).toBe(false);
    expect(isRetrievalCertain("???")).toBe(false);
  });

  it("never triggers the classifier model", () => {
    isRetrievalCertain("thanks for the gift advice");
    isRetrievalCertain("heyyy");
    expect(generateText).not.toHaveBeenCalled();
  });
});
