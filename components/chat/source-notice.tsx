import { InfoIcon } from "lucide-react";

// Shown above an answer when retrieval found nothing relevant in Alison's
// published writings. It frames the reply as general guidance rather than
// book-grounded advice, so a graceful refusal reads as intentional.
export function SourceNotice() {
  return (
    <div
      className="flex items-start gap-2 rounded-lg border border-amber-200/70 bg-amber-50/60 px-3 py-2 text-amber-900 text-xs dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
      data-testid="source-notice"
    >
      <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
      <p className="leading-snug">
        I couldn&apos;t find this in Alison&apos;s published writings, so this
        is general guidance rather than a direct citation.
      </p>
    </div>
  );
}
