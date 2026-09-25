# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ Known compromise — `postcss.config.mjs`

As of commit `bc93c99` (merge of PR #14) on `dev` and most remote branches, `postcss.config.mjs`
carries an obfuscated malware loader appended after `export default config;` on line 12, hidden
behind ~1,400 chars of whitespace padding. It resolves C2 addresses from Ethereum mainnet and
`eval`s/`spawn`s a remote payload. PostCSS loads this file on every `next dev` / `next build`.

`origin/main` (`641e74a`) is clean — the file there is 146 bytes. **Verify
`wc -c postcss.config.mjs` reports 146 before running any build or dev command.** If this section
is still here and the file is clean everywhere, delete this section.

## What this is

Ask Alison — an AI etiquette-advice chatbot for **Elevate Etiquette** (Alison M. Cheperdak), built on
the Vercel AI Chatbot template. Custom RAG over Alison's book *Was It Something I Said?*, her brand
voice in the system prompt, and an email gate that captures leads after the first question.

`docs/HANDOFF.md` is the project-specific companion doc (accounts, Vercel/Supabase access, env var
locations, migration process). `README.md` is the upstream template README and is mostly generic.

## Commands

```bash
pnpm install
pnpm dev                    # next dev --turbo
pnpm check                  # ultracite/biome lint — the ONLY thing CI runs; required check on main
pnpm fix                    # auto-fix

pnpm exec vitest run        # unit tests (no package.json script for these)
pnpm exec vitest run lib/rag/retrieval.test.ts    # single file
pnpm test                   # Playwright — see caveat below

pnpm ingest                 # embed ./content articles into Supabase
pnpm ingest:book <pdf>      # dry-run book chunking → tmp/book-chunks.json
pnpm ingest:book <pdf> --commit   # writes to the DB
```

- **Two separate test runners.** Vitest owns `__tests__/**/*.test.ts` and `{lib,app,scripts}/**/*.test.ts`
  (node environment, `@` → repo root). Playwright owns `tests/`. They do not overlap — `vitest.config.ts`
  explicitly excludes `tests/`.
- **`pnpm test` currently runs zero tests.** Playwright's `testMatch` is `/e2e\/.*.test.ts/` but
  `tests/e2e/` doesn't exist; only fixtures/helpers/page objects remain.
- **Run full `pnpm check`, never targeted.** Biome lints the whole repo and can't be pointed at
  parenthesized route paths like `app/(chat)/...`. It occasionally emits a non-fatal internal error
  on those files.
- **Pre-existing test failures** (per `docs/HANDOFF.md`, not caused by recent work): `mobile-greeting-layout`
  and two in `lib/ai/prompts.test.ts`. CI only lints, so these don't block merges.

## Architecture

### The route pages are empty on purpose

`app/(chat)/page.tsx` and `app/(chat)/chat/[id]/page.tsx` both `return null`. The entire chat UI lives in
`app/(chat)/layout.tsx` → `<ActiveChatProvider><ChatShell /></ActiveChatProvider>`. Navigating between
chats never remounts the UI; `hooks/use-active-chat.tsx` reads the chat id out of `usePathname()` and
swaps SWR keys. **Adding UI to a page component will do nothing** — edit `components/chat/shell.tsx`
or the provider instead.

`use-active-chat.tsx` (~420 lines) is the single source of truth for messages, streaming status, the
email gate, model selection, visibility, and readonly/inaccessible states. It owns the AI SDK `useChat`
instance. Most chat features start here.

### Auth is anonymous cookies, not Auth.js

Despite template leftovers, there is no Auth.js. `lib/session/anonymous.ts` issues two httpOnly cookies:

- `ask-alison-session` — no `maxAge`, dies with the browser; the default identity.
- `ask-alison-user` — 1 year, only honored if that user row **has an email in the DB**.

Both are `sameSite: "none"; secure: true` because the app is embedded as an iframe widget on
elevateetiquette.com (`public/widget.js`, CSP `frame-ancestors` in `next.config.ts`, CORS in `proxy.ts`).

The **email gate** (`lib/chat/email-gate.ts`) is one rule: no email on the user row + ≥1 prior user
message in the session ⇒ `403 forbidden:email_gate`. The client catches that code and shows
`components/chat/email-gate.tsx`. `POST /api/capture-email` then writes the email, emails the transcript
via Gmail, appends to a Google Sheet (`lib/google/lead-capture.ts`, OAuth refresh-token flow), and
upgrades the visitor to the persistent cookie.

### The chat request pipeline

`app/(chat)/api/chat/route.ts` is the heart of the app. Order matters and several steps run in parallel
for latency:

1. `isAllowedMutatingOrigin` (`lib/security/origin.ts`) — origin/referer allowlist; always true in dev.
2. Zod parse (`./schema.ts`), session id, in-memory rate limit (`lib/rate-limit.ts` — per-process Map,
   so it resets on every serverless cold start).
3. **Speculative embedding**: if this is the first message *and* `isRetrievalCertain()` says retrieval
   will definitely run, `generateEmbedding` is kicked off before the DB round-trip. A no-op `.catch()` is
   attached the moment it's created, so a fast gateway error can't surface as an unhandled rejection.
4. Bootstrap fan-out: user/chat/messages/message-count in one `Promise.all`, racing `shouldSkipRetrieval()`.
5. Ownership check → email gate → `isExtractionAttempt()` (`lib/rag/input-guard.ts`), which short-circuits
   to a canned refusal streamed by `lib/chat/static-reply.ts` — no model call.
6. `buildRetrievalQuery()` rewrites the query against the last ~9 turns, in parallel with persisting the
   user message.
7. `retrieveRelevantChunks()` → `formatChunksForPrompt()` → `buildSystemPrompt()`.
8. Sources (or a `no-context` notice) are written to the UI stream **before** `streamText` starts, so
   citations render ahead of the answer.
9. `onFinish`: copy-guard check (logged only, see below), persist the assistant message with its sources,
   optional faithfulness eval, best-effort title generation for new chats.

If anything throws before the stream starts, the outer catch calls `rollbackFailedTurn`
(`lib/chat/failed-turn.ts`) to delete the chat or user message this request saved. Otherwise the unanswered
message counts toward the email gate and the visitor hits the gate on retry.

**Copy guard is monitor-only.** `checkCopyViolation` used to replace the answer with a refusal, which
caused the saved message to differ from what the user saw on refresh. It now only calls `logSecurityEvent`
(see commit `ba28d1b`). Don't "fix" this by restoring the substitution without solving the mismatch.

### RAG (`lib/rag/`)

Hybrid retrieval — pgvector similarity + Postgres full-text, fused with Reciprocal Rank Fusion inside the
`match_content_chunks_hybrid` Supabase RPC. The vector-only `match_content_chunks` RPC is retained for
rollback. Defaults: 12 candidates fused, top 8 kept, `minSimilarity` 0.2.

- `format.ts` holds the shared types and is re-exported through `retrieval.ts` — import from `retrieval`.
- `relevanceBand()` annotates each chunk high/moderate/low; those bands go into the prompt.
- Book chunks are embedded with a contextual header (`From <book>, Chapter N, "…", on <section>.`)
  prepended; the clean display text is stored separately in `content`.
- `pleasantry-classify.ts` decides whether to skip retrieval entirely for greetings/thanks.
- `eval.ts` grades faithfulness/relevance off-path, gated by `RESPONSE_EVAL_ENABLED=true`.

### Data layer

Supabase JS client with the **service-role key** (`lib/db/supabase.ts`) — all access is server-side and
unauthenticated at the DB level; ownership is enforced in application code
(`lib/security/chat-access.ts`). `lib/db/schema.ts` is type stubs only, *not* a live Drizzle schema —
the `pnpm db:*` scripts are inherited template plumbing. Real schema changes are hand-written SQL in
`supabase/migrations/` (001–006).

**Apply migrations to the prod DB before merging code that depends on them.** App and ingestion both
point at the single production Supabase project, so unmigrated schema breaks the live site on deploy.
Supabase free tier caps `maintenance_work_mem` at 32MB, too small for the `fts` GIN index — migration
003 raises it to 128MB for the build; keep that pattern for future large indexes.

### Models

Single model, routed through the Vercel AI Gateway: `anthropic/claude-haiku-4.5` for chat, titles, and
evals (`lib/ai/models.ts`, `lib/ai/providers.ts`). The model-selector UI exists but has one entry. On
Vercel the gateway authenticates via OIDC — `AI_GATEWAY_API_KEY` is deliberately unset there and only
needed off-Vercel. `OPENAI_API_KEY` is used **only** by local ingestion, which embeds via the OpenAI SDK
directly rather than the gateway.

## Conventions

- **pnpm only** (`packageManager` is pinned). Path alias `@/*` → repo root.
- Ultracite/Biome with a relaxed rule set — `noExplicitAny`, `noConsole`, `noMagicNumbers`,
  `noExcessiveCognitiveComplexity` and others are off (`biome.jsonc`). `components/ai-elements`,
  `components/elements`, `components/ui`, `lib/utils.ts`, `hooks/use-mobile.ts` and `docs/` are
  excluded from linting — these are vendored shadcn/template code, so don't hand-edit them.
- `.cursor/rules/ultracite.mdc` is the full Ultracite rule list (a11y, TS, React). Consult it before
  arguing with a lint error; it applies to all `.ts/.tsx/.js/.jsx`.
- `components/chat/` is app-specific; `components/ui/` and `components/ai-elements/` are library code.
- Analytics writes (`lib/analytics/track.ts`) and security logs (`lib/security/audit-log.ts`) are
  fire-and-forget — always `.catch(() => undefined)` them so they never fail a request.
- `main` is protected: PR-only, 0 approvals, required check `build (20)` = `pnpm check`.
