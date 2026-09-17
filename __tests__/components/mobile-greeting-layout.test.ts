/**
 * Regression tests for the mobile landing-screen overlap originally reported
 * at 375x667 (iPhone SE), where the greeting bled into the suggested actions
 * and the composer.
 *
 * The 2026 redesign removed the arrangement the original fix relied on: the
 * greeting used to be an absolutely-positioned `overflow-hidden` overlay
 * painted under a sticky composer, and the two were clipped against each
 * other. The landing screen is now a single centred column in normal document
 * flow (`components/chat/empty-state.tsx`), so the invariant that keeps the
 * 375x667 case working changed shape: instead of *clipping* the content, the
 * column must *scroll* and every element must stay reachable.
 *
 * The project has no DOM testing library configured (vitest is node-env only),
 * so these remain static source-code invariant checks.
 *
 * Invariants being guarded:
 *   1. The empty-state column scrolls rather than clipping, so nothing is
 *      unreachable on a short viewport.
 *   2. It is a real flex column in document flow — no absolute overlay, no
 *      sticky composer — so the stack cannot overlap itself.
 *   3. The composer is rendered inside that column, so it scrolls with the
 *      rest and is always reachable.
 *   4. Headline and wordmark step down on small viewports.
 *   5. The in-conversation layout keeps its sticky, opaque composer.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "..", "..");
const read = (rel: string) => readFileSync(join(repoRoot, rel), "utf8");

const emptyStateSource = read("components/chat/empty-state.tsx");
const shellSource = read("components/chat/shell.tsx");

function emptyStateRootClasses(): string {
  const match = emptyStateSource.match(/return \(\s*<div className="([^"]+)"/);
  if (!match) {
    throw new Error("Could not locate the empty-state root div");
  }
  return match[1];
}

function emptyStateColumnClasses(): string {
  const match = emptyStateSource.match(/<div className="(mx-auto[^"]+)"/);
  if (!match) {
    throw new Error("Could not locate the empty-state centred column");
  }
  return match[1];
}

function stickyComposerClasses(): string {
  const match = shellSource.match(/<div className="(sticky bottom-0[^"]+)">/);
  if (!match) {
    throw new Error("Could not locate sticky composer wrapper in shell.tsx");
  }
  return match[1];
}

describe("mobile landing layout invariants", () => {
  it("scrolls the empty-state column instead of clipping it", () => {
    const classes = emptyStateRootClasses();
    expect(classes).toMatch(/\boverflow-y-auto\b/);
    // `overflow-hidden` here would reintroduce the 375x667 bug by cutting off
    // the composer rather than letting the column scroll to it.
    expect(classes).not.toMatch(/\boverflow-hidden\b/);
  });

  it("allows the column to shrink inside its flex parent", () => {
    // Without `min-h-0` a flex child refuses to shrink below its content size
    // and `overflow-y-auto` never engages.
    expect(emptyStateRootClasses()).toMatch(/\bmin-h-0\b/);
  });

  it("lays the landing content out in normal flow, not as an overlay", () => {
    // Match only inside className strings — prose in the doc comment above
    // legitimately mentions these class names.
    const classNames = [...emptyStateSource.matchAll(/className="([^"]+)"/g)]
      .map((m) => m[1])
      .join(" ");
    expect(classNames).not.toMatch(/\babsolute\b/);
    expect(classNames).not.toMatch(/\bpointer-events-none\b/);
    expect(classNames).not.toMatch(/\bsticky\b/);
  });

  it("renders the composer inside the scrollable column", () => {
    // `children` is the composer, passed down from shell.tsx. If it moved out
    // of the column it would stop scrolling with the rest of the stack.
    const column = emptyStateSource.match(
      /<div className="mx-auto[\s\S]*?\{children\}[\s\S]*?<\/div>/
    );
    expect(column).not.toBeNull();
  });

  it("constrains the column width and keeps it centred", () => {
    const classes = emptyStateColumnClasses();
    expect(classes).toMatch(/\bmx-auto\b/);
    // 752px = the design's 720px content column + the 16px gutter either side,
    // so the suggestion grid lands at exactly 720px.
    expect(classes).toMatch(/max-w-\[752px\]/);
    expect(classes).toMatch(/\bpx-4\b/);
  });

  it("steps the headline down on small viewports", () => {
    expect(emptyStateSource).toMatch(
      /text-\[40px\][^"]*\bsm:text-\[52px\][^"]*\bmd:text-\[64px\]/
    );
  });

  it("steps the wordmark down on small viewports", () => {
    expect(emptyStateSource).toMatch(/\bh-14\b[^"]*\bsm:h-\[68px\]/);
  });

  it("keeps the in-conversation composer sticky and opaque", () => {
    const classes = stickyComposerClasses();
    expect(classes).toMatch(/\bz-1\b/);
    expect(classes).toMatch(/\bbg-background\b/);
  });

  it("only renders the empty state when there are no messages", () => {
    expect(shellSource).toMatch(
      /const isEmptyState =\s*messages\.length === 0 && !isLoading && !isChatInaccessible;/
    );
  });
});
