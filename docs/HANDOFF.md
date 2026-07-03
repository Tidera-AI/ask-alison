# Ask Alison — Developer Handoff

_Last updated: 2026-07-03_

Ask Alison is an AI etiquette-advice chatbot for **Elevate Etiquette** (Alison M. Cheperdak). It is built on the Vercel AI Chatbot template (Next.js + AI SDK) with a custom RAG layer over Alison's book, her brand voice in the system prompt, and the May 2026 Elevate Etiquette brand applied to the UI.

- **Repo**: `Tidera-AI/ask-alison` (default branch `main`, PR-only, protected)
- **Production**: https://ask-alison-six.vercel.app

---

## 1. Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, RSC), React, TypeScript |
| AI | Vercel AI SDK 6 (`ai` package); models routed via Vercel AI Gateway (`lib/ai/models.ts`, `lib/ai/providers.ts`) |
| RAG | Custom pipeline in `lib/rag/` — hybrid retrieval (pgvector embeddings + Postgres full-text search) over book chunks |
| Database | Supabase Postgres (also used via Drizzle ORM — `lib/db/schema.ts`, `lib/db/queries.ts`) |
| Auth | Auth.js (from the template) |
| Styling | Tailwind CSS + shadcn/ui, Elevate Etiquette brand tokens |
| Lint/format | Ultracite (Biome) — `pnpm check` / `pnpm fix` |
| Tests | Vitest-style unit tests (`*.test.ts`) + Playwright E2E (`pnpm test`) |
| Package manager | **pnpm** (path alias `@/*` → repo root) |
| Hosting | Vercel |

## 2. Accounts & access you need

1. **GitHub**: write access to `Tidera-AI/ask-alison`.
2. **Vercel**: the project lives under the **`elevateetiquette`** account (info@elevateetiquette.com, team scope `elevateetiquettes-projects`) — **not** a personal account. `vercel login` as that account to manage deploys/env vars. Project name: `ask-alison`.
3. **Supabase**: free-tier project, ref `lkqbnaigzdwpjmddkdkj`. Both the app and local book ingestion target this same production DB.
4. **OpenAI API key**: used **only locally** by the book-ingestion script (embeddings via the OpenAI SDK directly). Not needed in Vercel.

## 3. Environment variables

Env vars live in **three places**:

### a) Vercel (runtime for Production/Preview)
Managed via the Vercel dashboard or `vercel env`. Currently set:

- Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `NEXT_PUBLIC_*` variants
- Postgres (Production only): `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_USER/HOST/PASSWORD/DATABASE`
- `INGEST_SECRET` — auth for `POST /api/ingest` (Production + Preview)

**Gotchas:**
- Several vars are Production-only. Preview builds fail with `Missing SUPABASE_URL` unless vars are extended to the Preview environment.
- Sensitive vars (e.g. `SUPABASE_SERVICE_ROLE_KEY`) **cannot** be read back via `vercel env pull` — extend them to Preview via the dashboard checkbox, not the CLI.
- `AI_GATEWAY_API_KEY` is intentionally **not** set in Vercel: on Vercel, the AI Gateway authenticates automatically via OIDC. It is only needed for non-Vercel deployments.

### b) Local `.env.local` (gitignored)
Needed for local dev and for book ingestion (which runs only on a dev machine):

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=            # ingestion embeddings only — exists nowhere else
ALISON_NOTIFY_EMAIL=       # recipient for transcript notification emails
RESPONSE_EVAL_ENABLED=     # "true" to enable off-path answer grading (optional)
```

Templates: `.env.example` and `.env.local.example` in the repo root.

### c) Nowhere (unused template leftovers)
`AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`, `REDIS_URL` appear in `.env.example` (inherited from the chatbot template) but are not set in Vercel. Verify before assuming a feature that needs them is live.

GitHub Actions CI (`.github/workflows/lint.yml`) uses **no secrets** — it only runs the lint check.

## 4. Local development

```bash
pnpm install
cp .env.local.example .env.local   # then fill in values (see §3b)
pnpm dev                            # Next.js dev server (turbo)
pnpm check                          # ultracite/biome lint — run before every push
pnpm test                           # Playwright E2E
```

## 5. RAG pipeline & book ingestion

- Book content is chunked, embedded, and stored in Supabase; retrieval is **hybrid** (vector similarity + full-text search with a GIN index).
- Chat responses cite sources: inline `[n]` markers, a sources panel, graceful refusals when nothing relevant is retrieved (PR #5), relevance-band annotations on prompt sources (PR #6), and an optional async faithfulness/relevance eval that writes to `response_analytics` (PR #7, gated by `RESPONSE_EVAL_ENABLED`).
- **Ingestion is local-only**: `pnpm ingest:book <pdf> --commit` (script: `scripts/ingest-book.ts`). Requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` in `.env.local`. It embeds via the OpenAI SDK directly (not the AI Gateway).
- There is also an HTTP ingestion endpoint `POST /api/ingest` authenticated by `INGEST_SECRET`, and `scripts/ingest-remote.ts`.

Design docs: `docs/book-ingestion-implementation-plan.md` and `docs/book-ingestion-architecture-review.md`.

## 6. Database migrations

- SQL migrations live in `supabase/migrations/` (001–005 so far). Drizzle is also configured (`pnpm db:*` scripts).
- **Process rule: apply Supabase migrations to the prod DB _before_ merging code that depends on them** — app and ingestion both point at the single prod database, so unmigrated schema breaks the live site immediately on deploy.
- **Free-tier gotcha**: Supabase free tier has `maintenance_work_mem = 32MB`, too small for the `fts` GIN index build (~61MB). Migration 003 sets it to 128MB for the build — keep this pattern for future large index builds.

## 7. CI & branch protection

- `main` is protected: PR-only, **0 approvals required**, required check `build (20)` runs `pnpm check` (ultracite/biome).
- Biome lints the **entire repo**, including new SVG/asset-adjacent files — run full `pnpm check` locally before pushing, not targeted checks.
- Biome quirk: it can't be targeted directly at parenthesized Next.js route paths like `app/(chat)/...` and occasionally emits a non-fatal internal error on route files.

## 8. Current state of work (as of this handoff)

**Merged to `main`** (see git history for detail): book ingestion + hybrid retrieval (#2), migration fix (#3), full Alison system prompt (#4), RAG citations UI (#5), source relevance bands (#6), async faithfulness eval (#7), brand monogram/favicon (#8).

**In flight:**
- Branch `feat/prompt-book-citation-rules` — 1 commit ahead of `origin/main` (`4e894d8`: chapter-specific book citations, content funneling, sensitive-topic care). Needs a PR.
- Branch `feat/ai-elements-rag-ui` — 3 commits of RAG-UI work; check whether it was superseded by PR #5 before reviving.
- Uncommitted in the working tree: several planning docs under `docs/` and `AGENTS.md`.
- Stale local/remote branches from merged PRs (`feat/rag-source-confidence`, `feat/rag-faithfulness-eval`, etc.) can be deleted.

**Known pre-existing test failures** (not caused by recent work): `mobile-greeting-layout` and two failures in `lib/ai/prompts.test.ts`. CI only runs lint, so these don't block merges — worth fixing or pruning.

## 9. Document index

| Doc | What it covers |
|---|---|
| `docs/chatbot-requirements-from-meetings.md` | Product requirements distilled from client meetings |
| `docs/chatbot-implementation-plan.md` | Overall implementation plan / phases |
| `docs/book-ingestion-implementation-plan.md` | Book ingestion design + plan (Phase 2 largely done) |
| `docs/book-ingestion-architecture-review.md` / `.pdf` | Architecture review of the ingestion pipeline |
| `docs/oss-patterns-research.html` | OSS chatbot pattern research that informed the RAG features |
| `Alison M. Cheperdak Bios & Website Copy*.md` | Client brand/voice source material |
| `brand-book-pitch.md` | Brand book pitch |
| `README.md` | Upstream template README (generic — this file is the project-specific doc) |
