/**
 * Regression tests for the mobile greeting-vs-suggested-actions overlap
 * originally reported at 375x667 (iPhone SE).
 *
 * Project has no DOM testing library configured (vitest is node-env only),
 * so these are static source-code invariant checks that lock in the
 * specific Tailwind tokens that make the fix work. If one of these classes
 * is later removed, the overlap regression returns — and this test fails
 * before a human has to reproduce it on a phone.
 *
 * Relevant layout invariants being guarded:
 *   1. Greeting wrapper clips its content to the Messages area
 *      (`overflow-hidden`) so flex-centered content cannot bleed into the
 *      sticky composer below on short viewports.
 *   2. Greeting wrapper stacks below the sticky composer (`z-0` vs the
 *      composer's `z-1 bg-background`) as a secondary paint-order guard.
 *   3. Greeting content is compact on mobile (smaller avatar, smaller
 *      heading) and the paragraph is hidden below the `sm` breakpoint so
 *      it fits inside the ~180px Messages area at 375x667.
 *   4. The sticky composer wrapper that the Greeting stacks under keeps a
 *      higher z-index than the Greeting and retains an opaque background.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "..", "..");
const read = (rel: string) => readFileSync(join(repoRoot, rel), "utf8");

const messagesSource = read("components/chat/messages.tsx");
const greetingSource = read("components/chat/greeting.tsx");
const shellSource = read("components/chat/shell.tsx");

function greetingWrapperClasses(): string {
  const match = messagesSource.match(
    /messages\.length === 0 && !isLoading &&[\s\S]*?<div className="([^"]+)"[\s\S]*?<Greeting/
  );
  if (!match) {
    throw new Error("Could not locate Greeting wrapper in messages.tsx");
  }
  return match[1];
}

function stickyComposerClasses(): string {
  const match = shellSource.match(
    /<div className="(sticky bottom-0[^"]+)">[\s\S]*?MultimodalInput/
  );
  if (!match) {
    throw new Error("Could not locate sticky composer wrapper in shell.tsx");
  }
  return match[1];
}

describe("mobile greeting layout invariants", () => {
  it("clips Greeting overflow to the Messages area", () => {
    expect(greetingWrapperClasses()).toContain("overflow-hidden");
  });

  it("stacks Greeting below the sticky composer", () => {
    const wrapper = greetingWrapperClasses();
    expect(wrapper).toMatch(/\bz-0\b/);
    expect(wrapper).not.toMatch(/\bz-10\b/);
  });

  it("keeps the horizontal gutter on the Greeting clip box, not inside Greeting", () => {
    expect(greetingWrapperClasses()).toMatch(/\bpx-4\b/);
    expect(greetingSource).not.toMatch(
      /className="flex flex-col items-center px-4"/
    );
  });

  it("sticky composer paints above the Greeting with a solid background", () => {
    const composer = stickyComposerClasses();
    expect(composer).toMatch(/\bz-1\b/);
    expect(composer).toMatch(/\bbg-background\b/);
  });
});

describe("Greeting content is compact at mobile and restored at sm+", () => {
  it("avatar is smaller on mobile and restored at sm", () => {
    expect(greetingSource).toMatch(/\bsize-11\b[^"]*\bsm:size-14\b/);
  });

  it("heading shrinks on mobile and scales back up at sm/md", () => {
    expect(greetingSource).toMatch(
      /font-serif text-xl[^"]*\bsm:text-2xl\b[^"]*\bmd:text-3xl\b/
    );
  });

  it("tagline paragraph is hidden below sm and shown from sm up", () => {
    expect(greetingSource).toMatch(/\bhidden\b[^"]*\bsm:block\b/);
  });
});
