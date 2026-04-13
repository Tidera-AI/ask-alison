import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = process.env.INGEST_URL ?? "https://ask-alison-six.vercel.app";
const SECRET = process.env.INGEST_SECRET ?? "";

if (!SECRET) {
  console.error(
    "Set INGEST_SECRET to the last 10 chars of your SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const CONTENT_DIR = resolve(process.env.CONTENT_DIR ?? "./content");

const sources = [
  {
    file: "blog-text-extracted.txt",
    source: "blog",
    title: "Elevate Etiquette Blog",
  },
  { file: "evie_posts_combined.md", source: "evie", title: "Evie Magazine" },
  {
    file: "substack_posts.md",
    source: "substack",
    title: "Substack Newsletter",
  },
  {
    file: "elevateetiquette_captions_all.txt",
    source: "instagram",
    title: "Instagram",
  },
  {
    file: "alison_knowledge_basev3.md",
    source: "knowledge_base",
    title: "Knowledge Base",
  },
];

async function ingest() {
  console.log("Starting remote ingestion...\n");

  for (const { file, source, title } of sources) {
    const filePath = resolve(CONTENT_DIR, file);
    let content: string;
    try {
      content = readFileSync(filePath, "utf-8");
    } catch {
      console.warn(`Skipping ${file} — not found`);
      continue;
    }

    const words = content.split(/\s+/).length;
    console.log(
      `Uploading ${file} (${source}) — ${words.toLocaleString()} words...`
    );

    const res = await fetch(`${BASE_URL}/api/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ingest-secret": SECRET,
      },
      body: JSON.stringify({ content, source, title }),
    });

    const data = await res.json();
    if (res.ok) {
      console.log(
        `  OK: ${data.chunks} chunks, ${data.new} new, ${data.inserted ?? 0} inserted`
      );
    } else {
      console.error(`  ERROR: ${JSON.stringify(data)}`);
    }
    console.log();
  }

  console.log("Done!");
}

ingest().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
