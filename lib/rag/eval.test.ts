import { describe, expect, it } from "vitest";
import { parseEvalResponse } from "./eval";

describe("parseEvalResponse", () => {
  it("parses a bare JSON object", () => {
    expect(
      parseEvalResponse('{"faithfulness": 0.9, "relevance": 0.8}')
    ).toEqual({ faithfulness: 0.9, relevance: 0.8 });
  });

  it("extracts JSON wrapped in a code fence or prose", () => {
    const raw =
      'Here is the score:\n```json\n{"faithfulness":1,"relevance":0.5}\n```';
    expect(parseEvalResponse(raw)).toEqual({
      faithfulness: 1,
      relevance: 0.5,
    });
  });

  it("clamps out-of-range scores into [0,1]", () => {
    expect(
      parseEvalResponse('{"faithfulness": 1.4, "relevance": -0.2}')
    ).toEqual({ faithfulness: 1, relevance: 0 });
  });

  it("returns null for non-numeric or missing fields", () => {
    expect(parseEvalResponse('{"faithfulness": "high"}')).toEqual({
      faithfulness: null,
      relevance: null,
    });
  });

  it("returns nulls when there is no JSON at all", () => {
    expect(parseEvalResponse("I could not evaluate this.")).toEqual({
      faithfulness: null,
      relevance: null,
    });
  });

  it("returns nulls on malformed JSON", () => {
    expect(parseEvalResponse('{"faithfulness": 0.5,,}')).toEqual({
      faithfulness: null,
      relevance: null,
    });
  });
});
