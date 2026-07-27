"use client";

import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { ChatbotError } from "@/lib/errors";
import { fetchWithErrorHandlers } from "@/lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function EmailGate({
  chatId,
  onCaptured,
}: {
  chatId: string;
  onCaptured: () => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await fetchWithErrorHandlers(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/capture-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId, email }),
        }
      );
      toast.success("Thanks! You can continue the conversation.");
      onCaptured();
    } catch (err) {
      if (err instanceof ChatbotError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="flex w-full max-w-4xl flex-col gap-3 rounded-2xl border border-border/50 bg-card/40 p-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] fill-mode-both"
      onSubmit={handleSubmit}
    >
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          Enter your email to continue the conversation
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          We&apos;ll email you a copy of this conversation. We&apos;ve also
          added you to the Elevate Etiquette mailing list for etiquette tips and
          updates. You can unsubscribe at any time.
        </p>
      </div>

      <Input
        autoComplete="email"
        autoFocus
        className="h-10 rounded-lg border-border/50 bg-background text-sm"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        required
        type="email"
        value={email}
      />

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button className="self-end" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
