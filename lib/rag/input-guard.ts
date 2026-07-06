const EXTRACTION_PATTERNS: RegExp[] = [
  /\b(print|paste|show|give|send|output|recite|dump|copy)\b.{0,40}\b(chapter|section|passage|book|manuscript)\b/i,
  /\b(entire|full|whole|complete|all)\b.{0,20}\b(book|manuscript|text)\b/i,
  /\b(raw|retrieved|source|context)\b.{0,30}\b(text|passage|chunk|content|data)\b/i,
  /\b(ignore|disregard|forget|override|bypass)\b.{0,30}\b(instruction|rule|prompt|system)\b/i,
  /\b(system prompt|your instructions|your rules|developer mode|jailbreak)\b/i,
  /\bwhat (are|is) your (system )?(prompt|instructions|rules)\b/i,
  /\brepeat your (instructions|prompt|rules)\b/i,
];

const SHORT_MESSAGE_MAX = 160;

export const EXTRACTION_REFUSAL =
  "I can't share full chapters, long passages, or internal source text from my book or other published work. " +
  "I'm here to offer brief, practical etiquette guidance in my own voice. " +
  "For the full picture, *Was It Something I Said?* is the best place to explore: https://www.amazon.com/dp/1400350123/";

function segmentsForScan(text: string): string[] {
  const trimmed = text.trim();
  if (trimmed.includes(":")) {
    const colonTail = trimmed.split(":").at(-1)?.trim();
    if (colonTail && colonTail.length >= 12) {
      return [colonTail];
    }
  }

  if (trimmed.length <= SHORT_MESSAGE_MAX) {
    return [trimmed];
  }

  return [trimmed];
}

function matchesExtractionPattern(text: string): boolean {
  return EXTRACTION_PATTERNS.some((pattern) => pattern.test(text));
}

export function isExtractionAttempt(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  return segmentsForScan(trimmed).some(matchesExtractionPattern);
}
