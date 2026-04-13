interface ChunkOptions {
  maxTokens: number;
  overlapTokens: number;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

export function chunkText(
  text: string,
  options: ChunkOptions = { maxTokens: 600, overlapTokens: 75 }
): string[] {
  const { maxTokens, overlapTokens } = options;

  if (estimateTokens(text) <= maxTokens) {
    return [text];
  }

  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());

  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);

    if (paragraphTokens > maxTokens) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join("\n\n"));
        currentChunk = [];
        currentTokens = 0;
      }
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) ?? [paragraph];
      for (const sentence of sentences) {
        const sentenceTokens = estimateTokens(sentence);
        if (
          currentTokens + sentenceTokens > maxTokens &&
          currentChunk.length > 0
        ) {
          chunks.push(currentChunk.join(" "));
          const overlapText = currentChunk.slice(-1);
          currentChunk = overlapTokens > 0 ? overlapText : [];
          currentTokens =
            overlapTokens > 0 ? estimateTokens(overlapText.join(" ")) : 0;
        }
        currentChunk.push(sentence.trim());
        currentTokens += sentenceTokens;
      }
      continue;
    }

    if (
      currentTokens + paragraphTokens > maxTokens &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk.join("\n\n"));
      const overlapText = overlapTokens > 0 ? currentChunk.slice(-1) : [];
      currentChunk = [...overlapText];
      currentTokens =
        overlapTokens > 0
          ? overlapText.reduce((sum, t) => sum + estimateTokens(t), 0)
          : 0;
    }

    currentChunk.push(paragraph);
    currentTokens += paragraphTokens;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join("\n\n"));
  }

  return chunks;
}
