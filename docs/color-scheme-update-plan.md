# Color Scheme Update Plan — Elevate Etiquette Brand Palette

## 1. Current State

All app color tokens are defined in [`app/globals.css`](../app/globals.css) using OKLCH and consumed through Tailwind v4's `@theme inline` block (`--color-*` aliases). Components reference tokens (`bg-background`, `text-foreground`, `bg-primary`, etc.) — there is almost no hardcoded color. Exceptions:

- `components/chat/sheet-editor.tsx` — `dark:bg-neutral-950 / -900 / dark:text-neutral-50` (dark-mode spreadsheet cells)
- `components/chat/icons.tsx` — inline SVG fills (verify)
- `app/globals.css` — code-mirror selection/cursor uses `oklch(0.55 0.12 250 / …)` (blue accent — should migrate to Ocean Blue)

**Implication:** swapping `:root` and `.dark` variables in `globals.css` propagates everywhere. Component changes are minimal.

### Current `:root` (warm blush + powder blue, OKLCH)

| Token | Current value | Role |
|---|---|---|
| `--background` | `oklch(0.98 0.008 350)` | Page bg (near-white blush) |
| `--foreground` | `oklch(0.18 0.01 50)` | Body text (warm near-black) |
| `--card` / `--popover` | `oklch(1 0.002 350)` | Card surfaces |
| `--primary` | `oklch(0.65 0.12 350)` | Brand pink |
| `--secondary` | `oklch(0.955 0.018 350)` | Secondary fill |
| `--muted` | `oklch(0.94 0.012 230)` | Muted blue-ish fill |
| `--accent` | `oklch(0.93 0.02 230)` | Powder blue accent |
| `--destructive` | `oklch(0.55 0.15 25)` | Red |
| `--border` / `--input` | `oklch(0.9 0.015 350)` / `oklch(0.92 0.012 350)` | Hairlines |
| `--ring` | `oklch(0.72 0.1 350)` | Focus ring |

---

## 2. New Brand Palette (target)

### Neutral Core

| Name | Hex | Role |
|---|---|---|
| White | `#FFFFFF` | Page backgrounds, light text |
| Cream | `#F8F2EE` | Section backgrounds |
| Stone | `#EEEBE6` | Alternative section fills |
| Light Gray | `#D6D2CC` | Default borders/dividers |
| Slate Gray | `#7A7470` | Secondary text (AA 14.2:1) |
| Near Black | `#3D3A37` | Dark text (AAA 14.2:1) |

### Warm Accents

| Name | Hex | Role |
|---|---|---|
| Pearl Pink | `#FAF0F5` | Warm section backgrounds |
| Dusty Pink | `#E8B8CC` | Warm section borders/dividers |
| Wisis Pink | `#EA539E` | **Decorative only** — accents/highlights, no text |

### Cool Accents

| Name | Hex | Role |
|---|---|---|
| Sky Blue | `#DAEAF5` | Cool section backgrounds |
| Mist Blue | `#A8C0D4` | Cool section borders/dividers |
| Ocean Blue | `#4A7A9B` | Secondary body links (AA 14.2:1) |

---

## 3. Token Mapping (light mode)

| CSS variable | New value | Source color | Rationale |
|---|---|---|---|
| `--background` | `#FFFFFF` | White | Clean page bg |
| `--foreground` | `#3D3A37` | Near Black | AAA contrast body text |
| `--card` | `#FFFFFF` | White | Card surface |
| `--card-foreground` | `#3D3A37` | Near Black | |
| `--popover` | `#FFFFFF` | White | |
| `--popover-foreground` | `#3D3A37` | Near Black | |
| `--primary` | `#3D3A37` | Near Black | **Primary buttons use Near Black** (Wisis Pink fails text contrast). Pink stays decorative. |
| `--primary-foreground` | `#FFFFFF` | White | |
| `--secondary` | `#F8F2EE` | Cream | Subtle warm fill |
| `--secondary-foreground` | `#3D3A37` | Near Black | |
| `--muted` | `#EEEBE6` | Stone | Muted fill |
| `--muted-foreground` | `#7A7470` | Slate Gray | Secondary text |
| `--accent` | `#FAF0F5` | Pearl Pink | Warm accent bg |
| `--accent-foreground` | `#3D3A37` | Near Black | |
| `--destructive` | _keep current red_ | — | Brand palette has no error red; retain `oklch(0.55 0.15 25)` |
| `--border` | `#D6D2CC` | Light Gray | Default border |
| `--input` | `#D6D2CC` | Light Gray | |
| `--ring` | `#A8C0D4` | Mist Blue | Calmer focus ring (Wisis Pink reserved decorative) — or `#4A7A9B` Ocean Blue for stronger emphasis |
| `--chart-1` | `#EA539E` | Wisis Pink | Decorative chart accent |
| `--chart-2` | `#4A7A9B` | Ocean Blue | |
| `--chart-3` | `#A8C0D4` | Mist Blue | |
| `--chart-4` | `#E8B8CC` | Dusty Pink | |
| `--chart-5` | `#7A7470` | Slate Gray | |
| `--sidebar` | `#F8F2EE` | Cream | Warm sidebar |
| `--sidebar-foreground` | `#3D3A37` | Near Black | |
| `--sidebar-primary` | `#3D3A37` | Near Black | |
| `--sidebar-primary-foreground` | `#FFFFFF` | White | |
| `--sidebar-accent` | `#FAF0F5` | Pearl Pink | |
| `--sidebar-accent-foreground` | `#3D3A37` | Near Black | |
| `--sidebar-border` | `#D6D2CC` | Light Gray | |
| `--sidebar-ring` | `#A8C0D4` | Mist Blue | |

### Decorative-only usage

`#EA539E` (Wisis Pink) must never carry text. Permitted: chart marks, illustration accents, gradient stops, badge fills with Near Black text, icon strokes, hover glow auras. Forbidden: button bg with white text, link color, any text fill.

### Brand color escape hatches

Add raw brand tokens for direct use in decorative components (logos, illustrations, marketing pages):

```css
--ee-white: #FFFFFF;
--ee-cream: #F8F2EE;
--ee-stone: #EEEBE6;
--ee-light-gray: #D6D2CC;
--ee-slate: #7A7470;
--ee-near-black: #3D3A37;
--ee-pearl-pink: #FAF0F5;
--ee-dusty-pink: #E8B8CC;
--ee-wisis-pink: #EA539E;
--ee-sky-blue: #DAEAF5;
--ee-mist-blue: #A8C0D4;
--ee-ocean-blue: #4A7A9B;
```

Exposed in `@theme inline` as `--color-ee-*` so `bg-ee-cream`, `text-ee-ocean-blue`, etc. work in JSX.

---

## 4. Token Mapping (dark mode)

Goal: warm-dark palette that echoes Near Black/Cream relationship, retains Wisis Pink as decorative-only.

| CSS variable | New value | Rationale |
|---|---|---|
| `--background` | `#3D3A37` (Near Black) | Brand-grounded dark |
| `--foreground` | `#F8F2EE` (Cream) | Warm light text |
| `--card` / `--popover` | _slightly lighter_ — `oklch(from #3D3A37 calc(l + 0.04) c h)` | Surface elevation |
| `--card-foreground` / `--popover-foreground` | `#F8F2EE` | |
| `--primary` | `#EEEBE6` (Stone) | Light pill on dark — pairs with Near Black text |
| `--primary-foreground` | `#3D3A37` | |
| `--secondary` | _Near Black +6% L_ | Subtle surface |
| `--secondary-foreground` | `#F8F2EE` | |
| `--muted` | _Near Black +8% L_ | |
| `--muted-foreground` | `#D6D2CC` (Light Gray) | |
| `--accent` | _Near Black + warm tint_ | |
| `--accent-foreground` | `#F8F2EE` | |
| `--border` / `--input` | _Near Black +10% L_ | Subtle hairlines |
| `--ring` | `#A8C0D4` (Mist Blue) | Focus stays cool/cohesive |
| `--sidebar` | _Near Black −2% L_ | Recessed |
| `--chart-*` | Wisis Pink, Ocean Blue, Mist Blue, Dusty Pink, Light Gray | Same hierarchy as light |

> Note: use `color-mix(in oklch, #3D3A37, white 6%)` or pre-compute OKLCH values. Keep variables in OKLCH for consistency with current file style.

---

## 5. Shadows & Effects

Update tinted shadows to use Near Black / Slate alpha (currently tinted with pink `oklch(0.65 0.05 350 / …)`):

- `--shadow-card`, `--shadow-float`, `--shadow-composer`, `--shadow-composer-focus`, `--shadow-glow`
- Replace pink-tinted alphas with `#3D3A37` at 6–12% alpha for neutral palette; or keep a softer Dusty Pink tint (`#E8B8CC / 10%`) for warmth on hover/glow only.
- `--shadow-glow` (currently pink ring): switch to Mist Blue `#A8C0D4 / 15%` for focus glow; reserve Wisis Pink glow for explicit "celebration" surfaces (e.g., success toasts).

---

## 6. Component / CSS Audit

| Location | Issue | Action |
|---|---|---|
| `app/globals.css:418` | CodeMirror selection `oklch(0.55 0.12 250 / …)` (blue) | Replace with Ocean Blue `#4A7A9B` at 15% alpha |
| `app/globals.css:453` | CodeMirror cursor (blue) | Ocean Blue `#4A7A9B` |
| `app/globals.css:458` | CodeMirror matching bracket (blue) | Ocean Blue `#4A7A9B / 12%` |
| `app/globals.css:339` | `glow-pulse` keyframe (pink ring) | Mist Blue or retain pink as decorative |
| `app/globals.css:464` | `.suggestion-highlight` uses `bg-blue-200/300` | Replace with Sky Blue / Mist Blue or tokenized accent |
| `components/chat/sheet-editor.tsx:53–66` | Hardcoded `dark:bg-neutral-950/900` | Replace with `dark:bg-card`, `dark:bg-muted`, or `bg-ee-near-black` |
| `components/chat/icons.tsx` | Inline SVG fills | Audit; switch to `currentColor` where possible |

Run after token swap:

```bash
rg -n "bg-(pink|rose|blue|sky|gray|slate|stone|neutral|zinc)-[0-9]+|text-(pink|rose|blue|sky|gray|slate|stone|neutral|zinc)-[0-9]+|#[0-9a-fA-F]{3,8}|oklch\(" components app
```

Every hit needs a token decision (replace with semantic token, replace with `ee-*` raw token, or justify keeping).

---

## 7. Accessibility Verification

After applying, verify:

- [ ] Body text (`foreground` on `background`): ≥ 7:1 (AAA). Near Black on White ≈ 12.6:1 ✓
- [ ] Secondary text (`muted-foreground` on `background`): ≥ 4.5:1. Slate Gray on White ≈ 4.7:1 ✓ (AA only — flag for tightening if used at small sizes)
- [ ] Primary button text (Near Black bg, White fg): ≈ 12.6:1 ✓
- [ ] Link color (Ocean Blue on White): ≈ 4.8:1 ✓ AA
- [ ] Focus ring (Mist Blue): non-text, ≥ 3:1 against adjacent — ≈ 1.8:1 against white ✗ — **use Ocean Blue ring instead, or 2px ring + offset**
- [ ] Destructive (red on white): keep AA
- [ ] Dark mode equivalents

**Action item:** likely promote `--ring` to Ocean Blue `#4A7A9B` for AA non-text contrast against white.

---

## 8. Implementation Phases

### Phase 1 — Token swap (single PR)

1. Replace `:root` and `.dark` blocks in `app/globals.css` with new values (use OKLCH conversions of the hex; keep file style consistent).
2. Add `--ee-*` raw brand tokens and expose via `@theme inline` as `--color-ee-*`.
3. Update shadow tints to neutral / Dusty Pink.
4. Update CodeMirror blue → Ocean Blue.
5. Update `.suggestion-highlight` to tokens.

### Phase 2 — Component cleanup

6. Fix `components/chat/sheet-editor.tsx` neutral classes → tokens.
7. Audit `components/chat/icons.tsx` and any other hardcoded colors.
8. Run grep audit (section 6) and resolve every hit.

### Phase 3 — Visual QA

9. Boot dev server, walk through: home, chat, composer, sidebar, dialogs, code blocks, tables, suggestion highlights, destructive states, dark mode toggle, focus states (keyboard nav).
10. Screenshot light + dark on desktop (1440) and mobile (375).
11. Run axe / Lighthouse contrast checks.

### Phase 4 — Decorative motifs

12. Identify 2–3 surfaces that benefit from Wisis Pink decoration (hero gradient, badge, illustration accent) and add tastefully.
13. Identify warm vs cool section pairing (Pearl Pink + Sky Blue alternating sections on long pages).

---

## 9. Open Questions

- Should `--primary` be Near Black (utilitarian) or Wisis Pink with Near Black text (more on-brand but limits primary button text to dark colors)? **Recommendation:** Near Black for primary actions, with a `bg-ee-wisis-pink` decorative class for celebratory CTAs that have icon-only or dark text.
- Dark mode tone — does Alison want a warm-black dark or a true neutral? Plan assumes warm-black (`#3D3A37` family). Confirm.
- Sidebar default — Cream warm sidebar vs White (matches body)? Plan picks Cream for warmth; flip to White if it competes with content.

---

## 10. Acceptance Criteria

- All tokens in `globals.css` reference the new palette; no stray pink/blue from the old scheme.
- Brand hex codes exist as `--ee-*` for decorative use.
- No hardcoded Tailwind `*-{50..950}` color utilities remain outside justified exceptions.
- Light + dark modes both pass AA for text, AAA for body, AA-non-text for focus.
- Wisis Pink never carries text in shipped code (grep enforced in PR review).
- Visual QA screenshots attached to PR.
