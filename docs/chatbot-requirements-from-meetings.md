# "Ask Alison" Chatbot — Requirements & Notes Extracted from Client Meetings

> **Purpose:** Every chatbot-related request, requirement, decision, consideration, and tip raised across the Matt × Alison meeting transcripts (Jan–May 2026), consolidated for the `ask-alison-2` build.
> **Scope note:** Website-redesign, blog-migration, photo, contact-form, branding-logo, email-alias, dashboard, MacBook, and general-SEO topics are deliberately **omitted** except where they directly shape the chatbot (e.g., the chat widget inheriting the brand style guide). Items that are AI-adjacent but *not* the public "Ask Alison" bot are flagged in [§13 Adjacent items](#13-adjacent-ai-items-not-the-public-chatbot).
> **People:** *Alison Cheperdak* = client / etiquette author ("Elevate Etiquette"). *Matt Chappell* = developer. *Amy/Amelia* = photography/design. Transcripts mis-spell Alison's surname and the book title; treat those as unreliable.

---

## 1. Meetings reviewed

| Date (2026) | Meeting | Chatbot content |
|---|---|---|
| Jan 19 | Intro call | **Concept born** — custom-LLM chat widget idea |
| Feb 5 | WordPress/Google sync | Alison requests a **scope/cost estimate** for the bot |
| Apr 2 | Strategy sync (+Amy) | **Richest** — confirmed #1 want, tone prototype, rights Qs, funnel concept, sensitive-Q concern, multilingual |
| Apr 2 (audio) | Continuation | Chatbot locked in as a fixed deliverable in the roadmap |
| Apr 20 | Weekly sync | In development; **"free" decision**, analytics, email-capture debate, "Ask Allison" branding, voice/security stress test |
| Apr 21 | Claude/email session | *(Adjacent — personal email-triage agent, not the public bot)* |
| Apr 27 | Weekly sync | **No paywall**, pop-up widget (not separate window), capture history |
| May 4 | Weekly sync | **Transcript-as-value-add**, first-question-free, book-citation mechanics, widget from mockup |
| May 11 | Weekly sync | First Q free → email to continue; PDF transcript + newsletter opt-in; book-rights approach |
| May 14 | Matt × Amy | *(Website photos only — no chatbot content)* |
| May 18 | Weekly sync | Email-capture copy workflow; book/audiobook AI-rights concern |
| May 26 | Weekly sync | **Contract reviewed** — tone-only rights, quoting limits, chapter+buy-link CTA, source exclusions, book→Markdown training |

---

## 2. Concept, vision & origin

- **The core idea (Jan 19):** a custom LLM trained on Alison's entire body of work, surfaced as a subtle **chat widget** on the website. Users type an etiquette query and the bot pulls relevant content and summarizes it.
  - Matt: *"a custom LLM trained on all of your content … a little chat widget on the website that says 'chat — what do you need help on?' and suggested prompts like 'how do I navigate this funeral coming up?'"*
  - Pattern Matt has built before: a support-site RAG bot trained on help articles that searches all content and returns relevant articles with summaries. He framed it as a **"pretty light lift … embedding a custom LLM and a very intuitive chat bubble."**
  - Alison's reaction: *"That would be phenomenal."*
- **Inspiration / market framing (Jan 19):** the WSJ piece on creators (Mel Robbins / Tony Robbins / Cody Sanchez) selling **$99/month one-on-ones with an AI version of themselves.** This recurs later as a competitive/positioning benchmark.
- **First-mover enthusiasm (Apr 2):** Alison confirmed it's the **#1 thing she wants to do.** *"There aren't a lot of people doing it, and I like the idea of jumping on it early."*
- **Tone prototype already impressed her (Apr 2):** *"What you've done is super impressive in terms of the tone of voice, and it seems like I have a significant body of work to pull from."*
- **Positioning (Apr 20):** branded **"Ask Allison"**; pitched as on-demand, one-on-one-style support for *specific* questions that general content doesn't cover or that are hard to find.

---

## 3. Purpose & what the bot is *for*

- **Answer the user's specific / unique-circumstance etiquette question** — the long tail that her articles don't cover or that's hard to find on the site (Apr 20).
- **Be a funnel to the book** and to her other content — surface a useful answer, then point deeper (Apr 2, May 26).
- **Replace/relieve the one-on-ones she dislikes doing.** Alison: *"Right now, I do not love doing one-on-ones … it's like easy money, but I don't love it."* The bot is positioned as the scalable alternative for "one-on-one support" (May 11, May 26).
- **Capture audience intelligence** — what people ask is "gold" for her content strategy (Apr 20). See [§8 Analytics](#8-analytics--audience-intelligence).

---

## 4. Knowledge base / content sources (what it's grounded on)

- **Her full body of work** is the corpus: blog posts, **Substack** (~75 articles, ~25–30 to be surfaced), **EV/Elevate Edit magazine** articles, **Instagram/TikTok captions** (hundreds), news/media coverage, and **the book** (Jan 19, Apr 2, Apr 27, May 26).
- **The book → Markdown → train the LLM (May 26):** Matt: *"share a digital copy of the book text so I can convert it to Markdown and train the LLM on the book material."* (This is the book-ingestion pipeline.)
- **Prioritize pointing to other publicly available sources (May 26):** Alison: *"prioritize other publicly available sources — other news articles, other Substacks, other stuff online we can point them to … if there's an answer somewhere else that's not the book, great — then 'for so much more, there's this.'"*
- **Source exclusions / allow-list (May 26):** some media should **not** be cited.
  - Two *Daily Mail* stories are *"partially fine, but not 100%."*
  - A tabloid about White-House-staff plastic surgery / being blonde — exclude.
  - As the brand grows: prefer reputable outlets (*Martha Stewart, Town & Country*) over tabloids (*Us Weekly*); consider a **review/allow-list step** before a source is used.
  - Matt's plan: *"define the appropriate sources to cite … add that as an edge case,"* noting most common questions are already answered in her existing content.
- **Content-gap signal (Apr 2):** Alison wants to know what *categories/gaps* exist so she can write toward them and feed the bot more material. The WikiHow interview's questions are *"indicative of the things people are searching for."*

---

## 5. Book integration & rights/legal (CRITICAL — drives bot behavior)

This is the most legally-loaded area and was resolved over several meetings.

- **Apr 2 — first raised:** Alison loves citing the book (*"Chapter seven covers this"*) but needs to check her author rights first.
- **May 11 — approach:** *"I'm not going to ask for permission. I'm just going to read my contract, and if it's not in there, then we're going to go with it."* (Reasoning: if she asks the publisher, they'll likely say no.)
- **May 18 — audiobook/AI concern:** she'd read that a book *"can't be uploaded to any AI without consent of the author"* — but **she is the author and consents**; still needs to confirm the contract and note audiobook rights may differ.
- **May 26 — contract reviewed → the governing rules:**
  > *"I can't create a digital version of my book … or a replacement of my book and profit off it / use it in a commercial sense. **But I can use the manuscript to guide the tone of voice and the style of communication.** And I can definitely have the chatbot be a funnel to the book — give a little sampling of information, then 'for more information, here's the book.'"*

**Resulting book-handling rules for the bot:**
1. **Use the manuscript for tone/voice/style only** — do **not** reproduce the book or act as a digital replacement for it.
2. **Reference, don't quote.** Cap any direct quote at **~5–8 words** (Alison: *"don't quote more than eight words … or five words"*).
3. **Allude + point to chapters:** *"I think you'd love Chapter 8 on …"*; mention the **specific chapter relevant to the query.**
4. **Always include a buy CTA** — link to buy / Amazon link. On the "recommend on every prompt vs only when relevant" question, the decision was **always**: if relevant, name the chapter and where to find it; otherwise still end with a buy-the-book CTA (*"always … at the end, 'Anchor: who bought my book?'"*).
5. **Don't be so useful it kills book demand.** Alison: *"The chat shouldn't be so useful that it obviates the desire or the need for the book."* Matt: *"Give them enough to pique their interest, answer their question, but lead them on to buy the book."*
6. **Multifaceted, not gating:** she rejected gating answers behind a book purchase (*"I don't love that idea"*) — wants the book for book-lovers and other media for others.

---

## 6. Behavior, tone & guardrails (the "bot instructions" / system prompt)

- **There is a living "chatbot instructions" doc** (a Google Doc / ClickUp note) that is *"the instruction manual"* / system prompt for the bot (May 26). It must be kept updated with the rules below. Claude is used to help apply the edits.
- **Voice & tone:**
  - Must be **consistently in Alison's voice and tone** — explicitly part of the pre-launch stress test (Apr 20).
  - **"Adopt tone from the book"** is an explicit instruction to add (May 26).
  - **Name the user's emotional experience (Apr 20):** *"The more you can put to words the emotional experience someone is having, the more you seek to resolve or support."*
- **Soft, not salesy (Apr 20):** *"I'd like to keep it free, especially because it's not salesy — it's soft. The more it can link to stuff I have on my website or other places, the better."*
- **Always link out:** to a relevant blog post / Substack post (or other reputable media) for "more" (Apr 20, May 26).
- **Sensitive / personal questions (Apr 2):** *"People ask a lot of uncomfortable, personal things in the chatbot space."* Matt agreed. → Handle sensitive topics with care/privacy.
- **Citation rules / "chatbot guidelines" = TBD (May 4)** then largely resolved by the May 26 book rules above.
- **Compliance & security (Apr 20):** a stress-test round to confirm it's *"compliant, secure, and consistently in your voice and tone"* before launch.
- **Mobile correctness (Apr 20):** early build had bugs — content hidden on mobile and *"handling different questions not as correctly as it should."*

---

## 7. Lead capture & email collection

- **No paywall — the bot is free (Apr 20, Apr 27).** Alison decided after reading a comparative-analysis doc of similar offerings: *"My inclination is to make it free."* Matt agreed.
- **Email-capture value-add = the conversation transcript (May 4, May 11):**
  - Flow: let them ask the **first question free**, then ask for an email **to continue** *or* offer (softer) at the end: *"enter your email and we'll send you a transcript of this conversation so you don't forget."*
  - The emailed transcript should be a **PDF "for your records."**
  - Include **newsletter opt-in language** ("we've added you to our email list so we can keep in touch") **and an unsubscribe line** ("you can unsubscribe at any time"). Alison wants to review/soften this copy.
- **Email-capture copy workflow (May 18):** draft with Claude first, then Alison edits.
- **Route captured emails to her list(s) (May 4, Apr 20):** add to her **Substack** email list (Substack carries the legal/unsubscribe language), and possibly **Salesforce** — either a weekly roundup she adds manually, or automated.
- **The soft-vs-gated tension (Apr 20):** Alison is *"such a data person — the more info we can get about who is on the website and what questions they're asking, that would be gold,"* but worries a hard email gate deters people (*"like staying on the line for the customer-service survey"*). Wants research on whether people guard their emails, and what competitors require.
- **Competitor info-required research (Apr 20):** add a field to the competitor report covering **what user info Tony Robbins / Cody Sanchez-style AI tools require.**

---

## 8. Analytics & audience intelligence

- **Capture full conversation history + user information (Apr 20, Apr 27).**
- **Auto-collectable on the back end without an email gate (Apr 20):** location, device, session duration, number of questions, **types of questions, and exact prompts.**
- **Explicit identity (name/email) requires a capture step/CTA** (Apr 20).
- This question-level data is the primary feedback loop into her content strategy (what to write next).

---

## 9. UI / widget / placement

- **Pop-up chat widget, not a separate window (Apr 27):** *"have it as a pop-up … like any other chatbot on any website, like a support bot."*
- **Embedded on the website;** a direct link was also floated as an option (Apr 20).
- **Brand-matched styling (May 4, May 11):** the widget inherits the site/blog **brand style guide** — *"apply the same colors to the chatbot"* so it matches the landing page and blog. Built from a **mockup.**
- **"Ask Allison" / "Chat with Alison" naming** (Jan 19, Apr 20).
- **Suggested prompts framed around felt needs / emotional moments** (Jan 19, Apr 20):
  - *"How do I navigate this funeral?" · "Planning a baby shower?" · "Setting a table for the first time?" · "Going on a first date?" · "Giving a keynote presentation?"*
  - Marketing line: *"Do you need one-on-one support to answer your specific questions? This is what this chat is for — let's get you the help you need now."*

---

## 10. Go-to-market, marketing & positioning

- **Free, first-mover, soft/non-salesy** (see §2, §6, §7).
- **Position as on-demand "one-on-one support"** and as a reason the website itself feels impressive (Apr 20): *"Wow, this website is amazing — there's even a chatbot that answers my specific questions."*
- **Marketing copy vs. system instructions blur (Apr 20):** the felt-need prompts double as marketing to drive engagement; build both.
- **Launch:** repeatedly slipped (targets floated: "May 1," May 29, then **June 5**); intended to **launch alongside the new website** once brand/logo assets and the bot stress-test were done.

---

## 11. Multilingual / international (consideration)

- **International audience needs (Apr 2):** *"a significant amount of people who are not from the US … want to understand US customs"* (e.g., baby showers).
- Possible **multi-language support / book translation** (Matt referenced a Claude book-translation skill). Even surfacing other languages *"creates the perception of demand"* and bolsters credibility. Not committed — logged as a "could be really cool" idea.

---

## 12. Scope, effort & commercials

- **Feb 5 — explicit ask:** Alison requested *"an email that's an estimate of how much work that would be and what that would look like"* for the chatbot.
- **Framed as a light lift** to embed a custom LLM + chat widget (Jan 19); the widget itself built from a mockup (May 4).
- Part of the broader engagement at a **$50/hr "family & friends" rate**; work tracked in **ClickUp** (Kanban: Backlog → Ready for Dev → In Progress → Resolved → Closed).

---

## 13. Adjacent AI items (NOT the public chatbot)

> Included so nothing is lost; these are distinct from the "Ask Alison" customer-facing bot and overlap with otherwise-out-of-scope areas.

- **AI-visibility / GEO tracking (Apr 2):** a service to measure & improve how often Alison appears in *external* AI/chatbot answers (ChatGPT, Perplexity, Google AI). Goal: convert content from "walled gardens" (Instagram/TikTok) into structured, AI-readable web content (markdown, structured data) so external chatbots cite her over competitors (Emily Post, Diane Gottsman, Myka Meier). This is **about external chatbots + website SEO**, not the Ask Alison bot — but it shares the "make her content AI-consumable" plumbing.
- **Personal email-triage AI agent (Apr 20, Apr 21):** an `n8n` + Claude/ChatGPT workflow on Alison's own machine that fetches her ~3–5 inboxes and returns prioritized summaries/draft replies. **Internal productivity tool**, not the public bot.

---

## 14. Open questions / TBD

- [ ] Final **email-capture trigger**: hard gate after first question vs. soft "want the transcript?" at the end (data capture vs. UX — unresolved tension, §7).
- [ ] **Source allow-list / exclusions** finalized (exclude the named tabloids; review process as brand grows, §4/§5).
- [ ] Confirm **book/audiobook contract** specifics and lock the quoting limit (~5–8 words) and "tone-only" usage into the system prompt (§5).
- [ ] **Email routing** destination(s) confirmed: Substack list and/or Salesforce; manual weekly roundup vs. automated (§7).
- [ ] **Multilingual** in or out of v1 (§11).
- [ ] Keep the **bot-instructions doc** as the single source of truth and apply the §5–§6 rules (§6).

---

*Compiled from 13 Krisp meeting transcripts spanning 2026-01-19 → 2026-05-26.*

---
---

# Part II — Implementation Status (codebase audit)

> **What this is:** a gap analysis of the `ask-alison-2` codebase (branch `feat/ai-elements-rag-ui`) against the requirements in Part I, audited **2026-06-19**.
> **Verdict:** the **core RAG chatbot is built and shipped** — persona, book grounding, hybrid retrieval, inline citations, graceful refusals, free access. The major outstanding areas are **lead/email capture (entirely absent)**, the **embeddable pop-up widget** form factor, **richer analytics**, and a few **specific book-citation rules** from Alison's contract review.
> **Stack:** Next.js (App Router) on the Vercel AI Chatbot template, Supabase (pgvector), AI SDK, branded "Elevate Etiquette."
> **Legend:** ✅ implemented · 🟡 partial / needs refinement · ⚙️ mechanism present, not configured · ❌ outstanding

---

## 15. Status matrix (cross-referenced to Part I)

| Part I requirement | Status | One-line note |
|---|---|---|
| §2 Custom LLM grounded on her work | ✅ | Hybrid RAG over `content_chunk` |
| §2/§3 "Ask Alison" persona | ✅ | First-person Alison system prompt |
| §3 Answer specific etiquette Qs | ✅ | RAG + scripts in the prompt |
| §3 Funnel to the book | ✅ | Conditional book-promotion rule |
| §3 One-on-one-support positioning | ❌ | No marketing copy/CTA for it |
| §3 Audience intelligence | 🟡 | Questions logged; no report/loop back |
| §4 Book in knowledge base | ✅ | `ingest-book.ts` + metadata |
| §4 Blog/Substack/magazine/social corpus | 🟡 | Schema + ingest **wired**, corpus looks book-centric |
| §4 Source exclusions / allow-list | ⚙️ | `is_retrievable` + `source_filter` exist; no policy |
| §4 Content-gap signal | ❌ | No tooling |
| §5 Reference, don't reproduce book | ✅ | "Synthesize… don't recite" |
| §5 ≤5–8 word quote cap | ❌ | Not enforced |
| §5 Name the specific chapter | 🟡 | Chapter in labels, not mandated in answer |
| §5 Always-on buy CTA | 🟡 | Conditional, not "always at end" |
| §5 Amazon/buy link | ✅ | `BOOK_LINK` |
| §5 Tone *from the book* | 🟡 | Voice defined generically |
| §5 No digital replacement / commercial | ✅ | Strict grounding, no reproduction |
| §6 Voice & tone | ✅ | Rich voice spec |
| §6 Validate / name emotion | ✅ | "Always validate the situation" |
| §6 Soft, not salesy | ✅ | Explicit in prompt |
| §6 Sensitive-question handling | 🟡 | Shame/judgment covered; not explicit |
| §6 Link out to other content | ✅ | Inline citations to sources |
| §6 Compliance/security/voice stress test | 🟡 | Unit tests only; no eval harness |
| §6 Bot-instructions doc → system prompt | ✅ | Shipped in PR #4 |
| §7 Free / no paywall | ✅ | Anonymous sessions |
| §7 Email capture (first-Q-free / gate) | ❌ | Not built |
| §7 Emailed PDF transcript value-add | ❌ | Not built |
| §7 Newsletter opt-in + unsubscribe copy | ❌ | Not built |
| §7 Route emails → Substack / Salesforce | ❌ | Not built |
| §8 Conversation history | ✅ | `message` table + sidebar |
| §8 Question / topic / retrieval analytics | ✅ | `chat_analytics` + `retrieval_analytics` |
| §8 Device / location / session-duration | ❌ | Not captured |
| §8 Admin dashboard to view analytics | ❌ | Not built |
| §9 Pop-up embeddable widget | ❌ | Standalone full-page app |
| §9 Brand-matched styling | ✅ | EE rebrand applied |
| §9 Suggested prompts | 🟡 | 6 present; plain Qs, not felt-need hooks |
| §9 "Ask Alison" naming | 🟡 | "I'm Alison" / "Elevate Etiquette" |
| §9 Citations UI ("Used N sources", inline [n]) | ✅ | AI Elements + persistence |
| §10 Free, first-mover | ✅ | — |
| §10 Marketing / felt-need positioning | ❌ | Not built |
| §11 Multilingual / international | ❌ | No i18n |
| §13 Competitor info-required research | ✅ | `influencer-ai-chatbots/` |
| §13 AI-visibility / GEO tracking | ❌ | Separate (not in repo) |
| §13 Personal email-triage agent | ❌ | Separate (not in repo) |

---

## 16. ✅ Implemented (with evidence)

- **Hybrid RAG grounded on her writings** — full-text + vector fused with RRF via the `match_content_chunks_hybrid` RPC; relevance floor and top-K trim. `lib/rag/retrieval.ts`, `supabase/migrations/003_book_and_hybrid.sql`.
- **Alison persona & voice** — first-person system prompt ("You are Alison Cheperdak…"), warm/soft/non-judgmental, 100–350 words, ends with encouragement, validates the person's situation. `lib/ai/prompts.ts:32`.
- **Soft, never salesy book funnel** — `bookPromotionRule()` ("never as a hard sell or an ad… user value always comes before promotion") + Amazon `BOOK_LINK`. `lib/ai/prompts.ts:6,8`.
- **Reference-not-reproduce + anti-AI-writing** — "synthesize in my own voice; don't quote long passages or recite the text"; dedicated "Avoid AI Patterns" section. `lib/ai/prompts.ts`; `humanizer-findings.md`.
- **Strict grounding + graceful refusal** — answer ONLY from retrieved context; `filterByRelevance` floor `0.2` returns `[]` when off-topic → route emits `data-notice` → `SourceNotice` ("general guidance rather than a direct citation"). `lib/rag/format.ts:114,120`, `app/(chat)/api/chat/route.ts:133`, `components/chat/source-notice.tsx`.
- **Inline citations + "Used N sources" panel, persisted** — `chunksToSources` keeps 1:1 numbering with `[Source n]`; rendered via `ai-elements/sources.tsx`, `citation-marker.tsx`, `rehype-inline-citations`; persisted to `message.sources`. `lib/rag/format.ts:102`, `supabase/migrations/004_message_sources.sql`.
- **Book ingestion pipeline** — dry-run-by-default, contextual chapter/section/page headers, `INGEST_SECRET`-gated endpoint. `scripts/ingest-book.ts`, `lib/rag/book-chunker.ts`.
- **Free / no paywall** — anonymous cookie sessions, no auth gate. `lib/session/anonymous.ts`.
- **Conversation history + conversation-aware retrieval** — `message` table, sidebar history, last-10-turn context, query rewrite folds prior turns. `app/(chat)/api/chat/route.ts:75-86`.
- **Question + retrieval analytics** — `chat_analytics` (question, topics, chunks) and `retrieval_analytics` (query, rewritten query, chunk ids, scores). `lib/analytics/track.ts`, migration `001`/`003`.
- **Branding, greeting, suggested prompts** — EE rebrand; "Welcome! I'm Alison… your AI etiquette guide"; 6 starter prompts. `components/chat/greeting.tsx`, `lib/constants.ts`.
- **Competitor research deliverable** — Tony Robbins, Codie Sanchez, et al. `influencer-ai-chatbots/`.

## 17. 🟡 Partial / needs refinement

- **Book-citation rules from the May 26 contract review (§5):** the **≤5–8-word hard quote cap is not enforced**; the prompt doesn't explicitly require **naming the specific chapter**; book recommendation is **conditional ("most conversations")** rather than the **"always end with a buy CTA"** Alison landed on; **"adopt tone from the book"** isn't stated (voice is defined generically). *(~30-min prompt edit in `lib/ai/prompts.ts`.)*
- **Knowledge-base breadth (§4):** schema `source` CHECK and `scripts/ingest.ts` are wired for `blog, substack, evie, instagram, knowledge_base`, but there is **no `./content` directory locally** and the live corpus appears **book-centric**. *(See verification items §19.)*
- **Source exclusions / allow-list (§4/§5):** ⚙️ mechanism exists — the hybrid RPC filters `is_retrievable` and an optional `source_filter` allow-list (`migration 003:73-84`) — but no tabloid-exclusion policy is configured (that content isn't ingested).
- **Analytics depth (§8):** questions/topics/retrieval are logged, but **no device, location, or session-duration**, and **no admin dashboard** to view any of it.
- **Suggested prompts framing (§9):** present, but written as plain questions rather than felt-need hooks ("Are you planning a baby shower?").
- **Naming (§9):** branded "Elevate Etiquette" / "I'm Alison" rather than the "Ask Alison" label discussed.
- **Sensitive-question handling (§6):** boundaries cover shame/judgment and legal/medical/financial redirects, but there's no explicit guidance for the "uncomfortable personal questions" Alison flagged.
- **Compliance / voice stress test (§6):** RAG unit tests exist; no formal eval harness for "compliant, secure, consistently in voice."

## 18. ❌ Outstanding (not built)

- **Lead capture / email — entirely absent (§7).** No email, PDF, transcript-emailing, waitlist, or newsletter code; no `resend`/`nodemailer`/PDF deps. Missing: first-question-free → email-to-continue, **emailed PDF transcript** value-add, newsletter opt-in + unsubscribe copy, and routing captured emails to **Substack/Salesforce**. *This is the single biggest build.*
- **Embeddable pop-up widget (§9).** It's a **standalone full-page chat site** (sidebar history, visibility selector, artifacts), not a widget that pops up on the existing website. (`sameSite:"none"` cookies suggest embedding was anticipated, but no embed/iframe script exists.)
- **"One-on-one support" marketing positioning (§3/§10)** — no CTA/copy framing the bot as the scalable alternative to her one-on-ones.
- **Multilingual / international support (§11)** — no i18n or language handling.
- **Content-gap tooling (§4)** — nothing surfaces "what people ask but isn't covered" back to Alison (the analytics data exists to power this; the loop doesn't).
- **Adjacent (§13)** — AI-visibility/GEO tracking and the personal email-triage agent are not in this repo (expected; they're separate efforts).

## 19. Verification items (couldn't confirm from code alone)

- [ ] **Production corpus contents** — what's actually ingested in the prod Supabase: book-only, or articles/Substack/social too? (Local repo has no `./content`.)
- [ ] **Widget embedding** — is the deployed app embedded anywhere on the live website, or only reachable as its own site?

## 20. Suggested prioritized backlog

| # | Item | Area | Rough effort | Priority |
|---|---|---|---|---|
| 1 | Tighten book-citation rules in system prompt (≤5–8-word cap, name chapter, always-on buy CTA, "tone from book") | §5 | ~30 min | High (cheap, contract-driven) |
| 2 | Confirm/seed the multi-source corpus (blog, Substack, EV/evie, IG captions) | §4 | Hours (data-dependent) | High |
| 3 | Lead capture: email step + emailed PDF transcript + newsletter opt-in/unsubscribe, route to Substack | §7 | Multi-day build | High (explicit client ask) |
| 4 | Embeddable pop-up widget (iframe/script) for the existing site | §9 | Medium | High (form factor mismatch) |
| 5 | Reframe suggested prompts as felt-need hooks + adopt "Ask Alison" naming | §9 | ~1 hr | Medium |
| 6 | Analytics: capture device/location/session-duration; simple admin view | §8 | Medium | Medium |
| 7 | Configure source allow-list / tabloid exclusions once non-book sources land | §4/§5 | Small | Medium (after #2) |
| 8 | Voice/compliance eval harness before launch | §6 | Medium | Medium |
| 9 | Multilingual support | §11 | Medium | Low (was "could be cool") |

---

*Codebase audited 2026-06-19 on branch `feat/ai-elements-rag-ui`. Evidence cited as `path:line`.*
