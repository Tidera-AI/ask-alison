// Book ingestion — dry-run by default.
//
//   pnpm ingest:book <path-to.pdf> [--commit] [options]
//
// Without --commit it writes chunks + metadata to tmp/book-chunks.json so the
// extraction can be eyeballed BEFORE any DB writes (the architecture review
// explicitly warns against direct production ingestion). With --commit it
// embeds (contextual header + content) and batch-inserts source='book' rows.
//
// The cleaning/heading patterns below are starting points. Run a dry-run first,
// inspect tmp/book-chunks.json, and tune CLEAN_PATTERNS / CHAPTER_REGEX against
// the real extraction (Phase 0 cataloguing) before committing.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { openai } from "@ai-sdk/openai";
import { createClient } from "@supabase/supabase-js";
import { embedMany } from "ai";
import {
  type BookSection,
  buildContextualHeader,
  chunkBook,
} from "../lib/rag/book-chunker";

interface CliOptions {
  pdfPath: string | null;
  fromText: string | null;
  commit: boolean;
  bookTitle: string;
  author: string;
  contentVersion: string;
  authorityTier: string;
  outFile: string;
}

const DEFAULTS = {
  bookTitle: "Was It Something I Said?",
  author: "Alison Cheperdak",
  contentVersion: "book-v1",
  authorityTier: "primary",
  outFile: "tmp/book-chunks.json",
};

// Lines matching any of these are dropped during cleaning. These are the
// concrete watermark / footer / distribution lines catalogued from the
// manuscript extraction — re-verify against a fresh dry-run if the PDF changes.
const CLEAN_PATTERNS: RegExp[] = [
  /_HCML\.docx/i, // "Was It Something I Said_HCML.docx - Page N of 320"
  /\bpage\s+\d+\s+of\s+\d+\b/i,
  /intended for the recipients?\s+use only/i,
  /distribution of this material/i,
  /^\s*\d{1,4}\s*$/, // standalone page numbers
  /^\s*was it something i said\?*\s*$/i, // running header
];

// Chapter heading, e.g. "Chapter 4", "Chapter Four", "Chapter 4: The Title".
// The keyword is required — making it optional matches any line starting with
// a number (e.g. legal text "4(3) of the Directive...") and shreds the parse.
const CHAPTER_REGEX =
  /^\s*chapter\s+(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b[.:)\s-]*(.*)$/i;

// Table-of-contents chapter row, used to recover chapter titles for the bare
// "Chapter N" running headers that appear in the body.
const TOC_CHAPTER_REGEX = /^\s*chapter\s+(\d{1,2})\s*:?\s*(.+?)\s+0{2,}\s*$/i;

// Back-matter markers — everything from the first match to the end is dropped.
const BACK_MATTER_REGEX =
  /^\s*(acknowledg(e)?ments|about the author|notes|index|bibliography|references)\s*$/i;

const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
};

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    pdfPath: null,
    fromText: null,
    commit: false,
    ...DEFAULTS,
  };

  // biome-ignore lint/style/useForOf: index is advanced manually to consume flag values.
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--commit") {
      opts.commit = true;
    } else if (arg === "--from-text") {
      opts.fromText = argv[++i] ?? null;
    } else if (arg === "--book-title") {
      opts.bookTitle = argv[++i] ?? opts.bookTitle;
    } else if (arg === "--author") {
      opts.author = argv[++i] ?? opts.author;
    } else if (arg === "--version") {
      opts.contentVersion = argv[++i] ?? opts.contentVersion;
    } else if (arg === "--authority-tier") {
      opts.authorityTier = argv[++i] ?? opts.authorityTier;
    } else if (arg === "--out") {
      opts.outFile = argv[++i] ?? opts.outFile;
    } else if (!arg.startsWith("--") && !opts.pdfPath) {
      opts.pdfPath = arg;
    }
  }

  return opts;
}

// pdftotext -layout, preserving form-feed page breaks so we can track pages.
function extractPdfText(pdfPath: string): string {
  try {
    return execFileSync("pdftotext", ["-layout", resolve(pdfPath), "-"], {
      encoding: "utf-8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `pdftotext failed (is it installed? \`which pdftotext\`): ${message}`
    );
  }
}

// pdftotext occasionally glues a chapter heading onto the previous sentence
// with no line break (e.g. "...it does.Chapter 2"). Only split when the heading
// is directly adjacent (no space) to avoid touching real mid-sentence prose.
function splitGluedHeadings(raw: string): string {
  return raw.replace(/([.!?a-z])(Chapter\s+\d{1,2}\b)/g, "$1\n\n$2");
}

interface PageLine {
  page: number;
  text: string;
}

// Split raw text into per-page lines (pdftotext separates pages with \f),
// dropping watermark/footer/page-number noise. Page numbers come from the
// page index, captured BEFORE cleaning removes printed page labels.
function cleanToLines(raw: string): PageLine[] {
  const pages = raw.split("\f");
  const lines: PageLine[] = [];

  pages.forEach((pageText, idx) => {
    const pageNumber = idx + 1;
    for (const rawLine of pageText.split("\n")) {
      const text = rawLine.replace(/\s+$/, "");
      if (!text.trim()) {
        lines.push({ page: pageNumber, text: "" });
        continue;
      }
      if (CLEAN_PATTERNS.some((re) => re.test(text))) {
        continue;
      }
      lines.push({ page: pageNumber, text: text.trim() });
    }
  });

  return lines;
}

function chapterNumberFrom(token: string): number | null {
  if (/^\d+$/.test(token)) {
    return Number(token);
  }
  return WORD_NUMBERS[token.toLowerCase()] ?? null;
}

// Probable section heading: short, no terminal punctuation, Title Case or
// ALL CAPS. Heuristic — verify against the dry-run output.
function isSectionHeading(text: string): boolean {
  if (text.length === 0 || text.length > 60) {
    return false;
  }
  if (/[.!?]$/.test(text)) {
    return false;
  }
  const words = text.split(/\s+/);
  if (words.length > 8) {
    return false;
  }
  const isAllCaps = text === text.toUpperCase() && /[A-Z]/.test(text);
  const isTitleCase = words.every(
    (w) => /^[A-Z0-9("']/.test(w) || w.length <= 3
  );
  return isAllCaps || isTitleCase;
}

// Walk cleaned lines into chapter/section-scoped sections, excluding
// front-matter (before chapter 1) and back-matter (after the first marker).
function buildTocTitleMap(lines: PageLine[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const { text } of lines) {
    const match = TOC_CHAPTER_REGEX.exec(text);
    if (match) {
      const num = Number(match[1]);
      const title = match[2].trim();
      if (!map.has(num) && title) {
        map.set(num, title);
      }
    }
  }
  return map;
}

function buildSections(lines: PageLine[]): BookSection[] {
  const sections: BookSection[] = [];
  const tocTitles = buildTocTitleMap(lines);

  let chapterNumber: number | null = null;
  let chapterTitle: string | null = null;
  let sectionTitle: string | null = null;
  let body: string[] = [];
  let pageStart: number | null = null;
  let pageEnd: number | null = null;
  let started = false;

  const flush = () => {
    const text = body.join("\n").trim();
    if (started && text) {
      sections.push({
        chapterNumber,
        chapterTitle,
        sectionTitle,
        pageStart,
        pageEnd,
        text,
      });
    }
    body = [];
    pageStart = null;
    pageEnd = null;
  };

  for (const { page, text } of lines) {
    // Only honour back-matter markers once we're in the body — the TOC also
    // lists "Acknowledgments"/"Notes"/"About the Author".
    if (started && text && BACK_MATTER_REGEX.test(text)) {
      flush();
      break;
    }

    // Table-of-contents rows look like chapter headings but end with the
    // "000" page-number placeholder — never let them start a chapter.
    const isTocRow = text ? /\b0{2,}\s*$/.test(text) : false;
    const chapterMatch = text && !isTocRow ? CHAPTER_REGEX.exec(text) : null;
    const matchedChapter = chapterMatch
      ? chapterNumberFrom(chapterMatch[1])
      : null;
    if (matchedChapter !== null) {
      flush();
      chapterNumber = matchedChapter;
      chapterTitle =
        chapterMatch?.[2]?.trim() || tocTitles.get(matchedChapter) || null;
      sectionTitle = null;
      started = true;
      continue;
    }

    if (!started) {
      continue; // skip front-matter
    }

    if (text && isSectionHeading(text)) {
      flush();
      sectionTitle = text;
      continue;
    }

    if (text) {
      if (pageStart === null) {
        pageStart = page;
      }
      pageEnd = page;
      body.push(text);
    } else if (body.length > 0) {
      body.push(""); // preserve paragraph breaks
    }
  }

  flush();
  return sections;
}

function normalizeForHash(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function contentHash(text: string, version: string): string {
  return createHash("sha256")
    .update(`${version}::${normalizeForHash(text)}`)
    .digest("hex")
    .slice(0, 32);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const model = openai.embedding("text-embedding-3-small");
  const batchSize = 100;
  const all: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    console.log(
      `  Embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}...`
    );
    const { embeddings } = await embedMany({ model, values: batch });
    all.push(...embeddings);
  }
  return all;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!(opts.pdfPath || opts.fromText)) {
    console.error(
      "Usage: pnpm ingest:book <path-to.pdf> [--commit] [--from-text file] " +
        "[--book-title t] [--author a] [--version v] [--out file]"
    );
    process.exit(1);
  }

  const rawExtract = opts.fromText
    ? readFileSync(resolve(opts.fromText), "utf-8")
    : extractPdfText(opts.pdfPath as string);

  const raw = splitGluedHeadings(rawExtract);
  const lines = cleanToLines(raw);
  const sections = buildSections(lines);
  const chunks = chunkBook(sections);

  console.log(
    `Parsed ${sections.length} sections -> ${chunks.length} chunks ` +
      `(book="${opts.bookTitle}", version="${opts.contentVersion}").`
  );

  const records = chunks.map((chunk) => {
    const header = buildContextualHeader(chunk, opts.bookTitle);
    return {
      content: chunk.content,
      embedInput: `${header}\n\n${chunk.content}`,
      content_hash: contentHash(chunk.content, opts.contentVersion),
      source: "book" as const,
      title: opts.bookTitle,
      url: null,
      topic: chunk.chapterTitle,
      word_count: chunk.content.split(/\s+/).filter(Boolean).length,
      metadata: {
        book_title: opts.bookTitle,
        author: opts.author,
        chapter_number: chunk.chapterNumber,
        chapter_title: chunk.chapterTitle,
        section_title: chunk.sectionTitle,
        page_start: chunk.pageStart,
        page_end: chunk.pageEnd,
        chunk_index: chunk.chunkIndex,
        authority_tier: opts.authorityTier,
        content_version: opts.contentVersion,
        is_retrievable: true,
        contextual_header: header,
      },
    };
  });

  if (!opts.commit) {
    const outPath = resolve(opts.outFile);
    mkdirSync(resolve(outPath, ".."), { recursive: true });
    writeFileSync(
      outPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          count: records.length,
          records,
        },
        null,
        2
      )
    );
    console.log(`\nDRY RUN — wrote ${records.length} chunks to ${outPath}.`);
    console.log("Review the output, then re-run with --commit to insert.");
    return;
  }

  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  requireEnv("OPENAI_API_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const hashes = records.map((r) => r.content_hash);
  const existing = new Set<string>();
  for (let i = 0; i < hashes.length; i += 200) {
    const { data } = await supabase
      .from("content_chunk")
      .select("content_hash")
      .in("content_hash", hashes.slice(i, i + 200));
    for (const row of data ?? []) {
      existing.add(row.content_hash);
    }
  }

  const fresh = records.filter((r) => !existing.has(r.content_hash));
  console.log(
    `${fresh.length} new chunks to embed (${records.length - fresh.length} already ingested).`
  );
  if (fresh.length === 0) {
    return;
  }

  const embeddings = await embedBatch(fresh.map((r) => r.embedInput));

  const rows = fresh.map((r, i) => ({
    content: r.content,
    embedding: JSON.stringify(embeddings[i]),
    source: r.source,
    title: r.title,
    url: r.url,
    topic: r.topic,
    word_count: r.word_count,
    content_hash: r.content_hash,
    metadata: r.metadata,
  }));

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase.from("content_chunk").insert(batch);
    if (error) {
      console.error(`Insert failed at row ${i}: ${error.message}`);
      process.exit(1);
    }
    inserted += batch.length;
  }

  console.log(`Inserted ${inserted} book chunks.`);
}

main().catch((err) => {
  console.error("Book ingestion failed:", err);
  process.exit(1);
});
