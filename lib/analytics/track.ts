import { supabase } from "../db/supabase";

interface AnalyticsEvent {
  chat_id: string;
  user_question: string;
  topics_matched: string[];
  chunks_used: number;
}

export async function trackQuestion(event: AnalyticsEvent): Promise<void> {
  const { error } = await supabase.from("chat_analytics").insert({
    chat_id: event.chat_id,
    user_question: event.user_question,
    topics_matched: event.topics_matched,
    chunks_used: event.chunks_used,
  });

  if (error) {
    console.error("Failed to track analytics:", error.message);
  }
}

interface RetrievalScore {
  id: string;
  source: string;
  similarity: number;
  rrf_score: number;
}

interface RetrievalEvent {
  chat_id: string;
  query_text: string;
  rewritten_query: string | null;
  chunk_ids: string[];
  scores: RetrievalScore[];
}

// Records which chunks were surfaced for a query, plus their scores, for
// retrieval traceability. Best-effort — never blocks the chat response.
export async function trackRetrieval(event: RetrievalEvent): Promise<void> {
  const { error } = await supabase.from("retrieval_analytics").insert({
    chat_id: event.chat_id,
    query_text: event.query_text,
    rewritten_query: event.rewritten_query,
    chunk_ids: event.chunk_ids,
    scores: event.scores,
  });

  if (error) {
    console.error("Failed to track retrieval analytics:", error.message);
  }
}

interface ResponseEvalEvent {
  chat_id: string;
  message_id: string;
  question: string;
  faithfulness: number | null;
  relevance: number | null;
  chunks_evaluated: number;
  model: string;
}

// Records a grader's faithfulness/relevance scores for one answer. Best-effort,
// runs off the user's hot path — never blocks or surfaces to the chat.
export async function trackResponseEval(
  event: ResponseEvalEvent
): Promise<void> {
  const { error } = await supabase.from("response_analytics").insert({
    chat_id: event.chat_id,
    message_id: event.message_id,
    question: event.question,
    faithfulness: event.faithfulness,
    relevance: event.relevance,
    chunks_evaluated: event.chunks_evaluated,
    model: event.model,
  });

  if (error) {
    console.error("Failed to track response eval:", error.message);
  }
}
