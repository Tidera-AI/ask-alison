# "Ask Alison" Chatbot — Implementation Plan (close out the gaps)

> **Goal:** take `ask-alison-2` from "core RAG bot shipped" to "everything done" — closing every 🟡 partial and ❌ outstanding item from the audit in [`chatbot-requirements-from-meetings.md`](./chatbot-requirements-from-meetings.md) (Part II, §15–§20).
> **Companion docs:** Part I = requirements from the meetings; Part II = codebase audit. This plan references those section numbers (e.g., §7 = lead capture).
> **Date:** 2026-06-19 · **Branch base:** `feat/ai-elements-rag-ui`

---

## 1. Decisions locked (this planning round)

| Decision | Choice |
|---|---|
| **Lead-capture model** (§7) | **Hybrid** — every question free; after the first answer, a soft, dismissible "email me the transcript" offer with a newsletter opt-in. **Never a hard wall.** |
| **Transcript / email sender** (§7) | **Google Workspace**, `From:` + `Reply-To:` **`info@elevateetiquette.com`** (Gmail API via a service account with domain-wide delegation, or Workspace SMTP relay). Resend + domain verification documented as the upgrade path. |
| **Subscriber routing** (§7) | **Google Sheet** = Alison's list of record (Sheets API append) **+ notify Alison by email** per new subscriber (with a daily-digest toggle). A lightweight **Supabase row** is kept to power the transcript send, dedupe, and unsubscribe. Substack/Salesforce **deferred** (Substack has no write API; CSV export remains possible from the Sheet). |
| **Embeddable widget** (§9) | **In scope** — build the pop-up bubble embed; sequenced so it can slip to fast-follow. (Site is now a custom build off Show it, so it can host an embed script — confirm in Phase 0.) |
| **Overall scope** | **Everything** — all partials + outstanding, phased; multilingual + eval harness included but last. |

---

## 2. Inputs / prerequisites — status (updated 2026-06-19 via `/gog`)

**✅ Done (Phase 0):**
- [x] **Workspace auth as `info@elevateetiquette.com`** — added to `gog` (scopes: docs, drive, gmail, sheets). *Runtime note:* gog uses locally-stored OAuth tokens — great for setup + any local/cron ops, but the **deployed app still needs** either a service account w/ domain-wide delegation **or** `info@`'s OAuth refresh token in env (decision below).
- [x] **Subscriber Google Sheet created & verified** — name "Ask Alison — Subscribers", tab `Ask Alison — Subscribers`, headers `email, opted_in_newsletter, source, chat_id, created_at, status`; append→read→clear smoke-tested. → **`SUBSCRIBER_SHEET_ID = 1X1_uEJSqr2JIhBE4LoaI10o-OhKDnPOf3QiIRSV1eA8`**
- [x] **Prod corpus is multi-source & already populated** — a live retrieval spot-check (2026-06-19) surfaced chunks tagged `book`, `substack`, `evie`, `blog`, and `knowledge_base`, so **Phase 2 is largely done, not a bottleneck**. Caveats: (a) source titles are generic ("Substack Newsletter", "Evie Magazine") → coarse citation labels worth enriching; (b) the **book under-surfaces on some on-topic queries** (e.g., an apology question returned zero book chunks) → retrieval-tuning candidate. Drive also holds EV/Elevate Edit articles as Docs if more ingestion is wanted; Instagram/TikTok captions aren't ingested. (`all_emails.csv` = Alison's inbox archive, not corpus.)

**⏳ Still needed from you:**
- [ ] **Alison's notification address** → `ALISON_NOTIFY_EMAIL`.
- [ ] **Book quote-rule sign-off** (§5): ≤5–8-word quote cap + "tone-only" usage.
- [ ] **Widget host check** (§9): can the live site host a `<script>` embed?
- [ ] **Production Google auth decision**: service account (domain-wide delegation) vs. reuse `info@` OAuth refresh token.

**ℹ️ FYI:** an Apps Script project **"Elevate Etiquette Lead Capture"** already exists in the Drive (created 2026-06-16) — possibly an earlier lead-capture attempt; review before building Phase 3 to avoid overlap.

---

## 3. Architecture additions (overview)

```
                         ┌─ Phase 1: prompt rules (book citation, tone, guardrails)
   existing chat route ──┤
   (RAG, citations) ─────┤─ Phase 3: POST /api/subscribe ─┐
                         │                                 ├─► lib/email   → Gmail/Workspace (info@) → transcript + Alison notify
   existing corpus ──────┤─ Phase 2: + blog/substack/      ├─► lib/google  → Sheets append (subscriber list)
   (book) ──────────────-┘   evie/instagram chunks         └─► Supabase    → subscriber table (dedupe, opt-in, unsubscribe)

   Phase 4: public/ask-alison.js  +  /embed route  ─► floating bubble on elevateetiquette.com
   Phase 6: analytics depth + /admin content-gap view
```

New modules: `lib/email/*`, `lib/google/*` (service-account client shared by Gmail + Sheets), `lib/pdf/*` (transcript), `app/(chat)/api/subscribe/route.ts`, `app/(chat)/api/unsubscribe/route.ts`, `app/(embed)/*`, `public/ask-alison.js`, `app/admin/*`.

---

## 4. Phased plan

### Phase 0 — Prerequisites & verification *(~0.5 day)*
**Goal:** unblock everything; confirm the two unknowns from the audit.
- Provision the Google service account + delegation; drop creds into env.
- Verify prod Supabase corpus contents (book-only vs. articles) — settles audit §19.
- Confirm the live site can host an embed script — settles the widget dependency.
- Create the subscriber Google Sheet; share with the service account.
**Acceptance:** a throwaway script can send a test mail from `info@` and append a row to the Sheet; corpus + host questions answered in writing.

---

### Phase 1 — Book-citation & guardrail prompt rules (§5, §6, §17) *(~0.5 day)*
**Goal:** encode Alison's contract-driven rules into the system prompt. Cheapest high-value win.
- Edit `lib/ai/prompts.ts`:
  - **Quote cap:** never quote more than ~5–8 consecutive words from the book; paraphrase otherwise.
  - **Name the chapter:** when book context is present, reference the *specific* chapter (data already in `chunkSourceLabel`).
  - **Always-on buy CTA:** end with a warm book nudge + Amazon link when the topic aligns; otherwise a soft close — tuned to stay non-salesy.
  - **Tone from the book:** explicitly instruct adopting the book's voice/style.
  - **Sensitive questions:** add guidance for uncomfortable/personal asks (warmth, no judgment, privacy).
  - **Prioritize other public sources:** when the book doesn't cover it, point to her articles/Substack ("for more, see …").
- Add prompt-rule unit/eval cases (quote length, chapter mention, CTA presence) — feeds Phase 7.
**Files:** `lib/ai/prompts.ts`, `lib/ai/prompts.test.ts` (new).
**Acceptance:** eval cases pass; manual spot-check shows chapter-named, short-quoted, on-voice answers with a natural CTA.

---

### Phase 2 — Corpus expansion (§4, §17, §19) *(~2–4 days, data-dependent)*
**Goal:** ground the bot on her full body of work, not just the book.
- Normalize source exports (blog, Substack, EV/evie, Instagram/TikTok captions) into the ingestion format. `papaparse` (already a dep) handles caption CSVs.
- Extend `scripts/ingest.ts` to tag `source` + `authority_tier` per type (schema already allows `blog|substack|evie|instagram|knowledge_base|book`).
- Set `is_retrievable=false` (or simply don't ingest) for any excluded tabloid items — wires up the source allow-list mechanism (§5) that already exists in the RPC.
- Re-run retrieval smoke tests; tune `DEFAULT_MIN_SIMILARITY` / `topK` if needed.
**Files:** `scripts/ingest.ts`, `lib/rag/chunker.ts`, content exports.
**Acceptance:** representative queries retrieve from multiple sources; excluded items never surface; citations render correct labels/URLs.

---

### Phase 3 — Lead capture + transcript email + routing (§7) — *the big build* *(~3–5 days)*
**Goal:** the hybrid soft-capture flow, end to end.
- **DB (migration `005`):** `subscriber` table — `id, email, chat_id, opted_in_newsletter, status (active|unsubscribed), source, created_at`; unique on email for dedupe.
- **Chat UI:** after the first assistant answer, render a soft, dismissible card — email field + "Email me this conversation" + newsletter opt-in checkbox + unsubscribe/"unsubscribe anytime" note. Never blocks further questions.
- **`POST /api/subscribe`:** zod-validate email → upsert `subscriber` → build transcript → send via Workspace → append to Sheet → notify Alison.
- **`lib/google/` (service-account client):** shared Gmail-send + Sheets-append using domain-wide delegation impersonating `info@`.
- **`lib/pdf/` transcript:** render the conversation to a clean PDF attachment (lightweight server-side lib — see §6 deps); email body is HTML with the PDF attached, `From`/`Reply-To: info@`.
- **Alison notification:** per-subscriber email (toggle: immediate vs. daily digest via a small cron/queue) to `ALISON_NOTIFY_EMAIL`.
- **`POST /api/unsubscribe`** + footer link: flip `status`, reflect in Sheet.
**Files:** `app/(chat)/api/subscribe/route.ts`, `app/(chat)/api/unsubscribe/route.ts`, `lib/google/*`, `lib/email/*`, `lib/pdf/*`, `lib/db/{schema,queries}.ts`, `supabase/migrations/005_subscribers.sql`, `components/chat/transcript-capture.tsx` (new), wire into `components/chat/messages.tsx`.
**Acceptance:** real run delivers a transcript from `info@`, a Sheet row appears, Alison gets notified, dedupe + unsubscribe work; questions stay free throughout.

---

### Phase 4 — Embeddable pop-up widget (§9) *(~2–3 days)*
**Goal:** the chat bubble on elevateetiquette.com (the original vision).
- `app/(embed)/embed/page.tsx`: minimal, chrome-less chat for iframing.
- `public/ask-alison.js`: injectable loader → floating bubble (bottom-right) → opens the embed iframe; configurable position/colors.
- Allowed-origins config for the embed + framing headers; `sameSite:"none"` cookies already set.
- One-line install snippet handed to the site.
**Files:** `app/(embed)/*`, `public/ask-alison.js`, `next.config.ts` (frame headers).
**Acceptance:** pasting the snippet on a test page shows the bubble; chat works in-frame incl. capture; brand-matched.
**Note:** can ship as fast-follow without blocking other phases.

---

### Phase 5 — Naming, suggested prompts & positioning (§9, §10) *(~0.5–1 day)*
**Goal:** the "Ask Alison" feel and felt-need hooks.
- Reframe `lib/constants.ts` prompts as felt-need hooks ("Planning a baby shower?", "Giving a keynote tomorrow?", "First dinner party?").
- Adopt **"Ask Alison"** naming in greeting/header/metadata/OG.
- Add the one-on-one-support positioning line/CTA (§3/§10).
**Files:** `lib/constants.ts`, `components/chat/{greeting,chat-header}.tsx`, `app/(chat)/layout.tsx` metadata.
**Acceptance:** first impression reads "Ask Alison"; prompts are emotional/scenario-led.

---

### Phase 6 — Analytics depth + content-gap loop + admin view (§8, §4) *(~2–3 days)*
**Goal:** turn captured questions into insight Alison can act on.
- Extend tracking with device + coarse location (request headers/edge geo) + session duration.
- **Content-gap report:** surface questions that retrieved **0 chunks** (the `data-notice` path) — exactly "what people ask that isn't covered."
- Simple gated `/admin` page: top questions, no-context questions, volume over time, capture rate.
**Files:** `lib/analytics/track.ts`, `app/(chat)/api/chat/route.ts`, `app/admin/*`, migration `006` (analytics columns).
**Acceptance:** admin view lists top + unanswered questions; a content-gap export exists.

---

### Phase 7 — Voice/compliance eval harness (§6) *(~1–2 days)*
**Goal:** a repeatable pre-launch check.
- Golden Q&A + assertions: stays in voice, refuses off-topic, never legal/medical/financial, obeys quote cap, cites when grounded, graceful no-context refusal.
- `pnpm eval` script over a fixtures set.
**Files:** `tests/eval/*`, script in `package.json`.
**Acceptance:** `pnpm eval` green; failures are actionable.

---

### Phase 8 — Multilingual (§11) — lowest priority *(~1–2 days, or defer)*
**Goal:** serve the international "US customs" audience.
- Detect user language; answer in kind (corpus stays English; retrieval in English, response translated). Keep it light; gate behind a flag.
**Acceptance:** a non-English question gets an on-voice answer in that language with intact citations.

---

## 5. Recommended sequence & milestones

| Milestone | Phases | Outcome | Rough effort |
|---|---|---|---|
| **M0 Unblock** | 0 | Creds, corpus + host answers | ~0.5 day |
| **M1 Quality & grounding** | 1 → 2 → 7(lite) | On-voice, multi-source, contract-compliant answers | ~3–6 days |
| **M2 Capture** | 3 | Transcript email + Sheet + Alison notify, fully working | ~3–5 days |
| **M3 Reach** | 5 → 4 | "Ask Alison" polish + embeddable bubble live on the site | ~3–4 days |
| **M4 Insight** | 6 | Analytics + content-gap loop for Alison | ~2–3 days |
| **M5 Extra** | 8 | Multilingual (optional) | ~1–2 days |

**Total:** ~13–21 ideal dev-days for everything; ~M0–M2 (~7–11 days) gets the headline client asks (compliant voice, full corpus, lead capture) shipped.

---

## 6. New dependencies & env vars

- **Deps:** `googleapis` (Gmail + Sheets via service account); a PDF lib (`pdfkit` *or* `@react-pdf/renderer` — recommend `pdfkit` for a small server footprint). (Optional later: `resend` for the upgrade path.)
- **Env:** `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_IMPERSONATE_SUBJECT=info@elevateetiquette.com`, `SUBSCRIBER_SHEET_ID`, `ALISON_NOTIFY_EMAIL`, `WIDGET_ALLOWED_ORIGINS`, `ADMIN_ACCESS_SECRET`.

## 7. Data-model changes

- `005_subscribers.sql` — `subscriber` table (email unique, opt-in, status, chat_id, source, created_at).
- `006_analytics_depth.sql` — add device/location/session-duration columns to `chat_analytics` (or a small `session_meta` table).

## 8. Testing strategy

- **Unit:** prompt rules (Phase 1), ingestion mappers (Phase 2), subscribe validation/dedupe (Phase 3), widget loader config (Phase 4).
- **Integration:** `/api/subscribe` happy-path + dedupe + unsubscribe with Google calls mocked; one live end-to-end smoke before launch.
- **Eval:** Phase 7 harness as the pre-launch gate.
- **E2E (Playwright):** capture-card flow; widget-in-iframe chat.

## 9. Risks & mitigations

- **Workspace send limits / deliverability** (~2k/day; transactional from a user domain) → low volume expected; SPF/DKIM via Workspace; documented Resend fallback if bounces/volume grow.
- **Substack has no write API** → resolved by Google-Sheet-of-record + CSV import; no fragile scraping.
- **Notification noise to Alison** → daily-digest toggle.
- **Widget host can't embed a script** → Phase 0 check; if blocked, widget slips to fast-follow with zero impact on M1/M2.
- **Corpus rights/quality** (tabloid exclusion, §5 quote cap) → `is_retrievable` allow-list + Phase 1 rules + Phase 7 eval.
- **PII in captured emails/transcripts** → minimal retention, unsubscribe honored, no third-party sharing.

## 10. Explicitly deferred / out of scope

- Substack **auto-sync** and **Salesforce** push (CSV export remains).
- AI-visibility / GEO tracking and the personal email-triage agent (audit §13 — separate efforts, not this bot).
- Paywall / gated access (decided against — bot stays free).

---

*Plan authored 2026-06-19. Cross-references requirements + audit in `chatbot-requirements-from-meetings.md`. Effort figures are ideal dev-days, not calendar time.*
