import { supabase } from "@/lib/db/supabase";
import { getOrCreateSessionUserId } from "@/lib/session/anonymous";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 100);
  const endingBefore = searchParams.get("ending_before");

  const userId = await getOrCreateSessionUserId();

  let query = supabase
    .from("chat")
    .select("id, title, user_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (endingBefore) {
    // Fetch the cursor chat's created_at to paginate
    const { data: cursor } = await supabase
      .from("chat")
      .select("created_at")
      .eq("id", endingBefore)
      .single();

    if (cursor) {
      query = query.lt("created_at", cursor.created_at);
    }
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const chats = data ?? [];
  const hasMore = chats.length > limit;

  return Response.json({
    chats: chats.slice(0, limit).map((c) => ({
      id: c.id,
      title: c.title,
      userId: c.user_id,
      visibility: "private",
      createdAt: c.created_at,
    })),
    hasMore,
  });
}

export async function DELETE() {
  const userId = await getOrCreateSessionUserId();

  const { error } = await supabase.from("chat").delete().eq("user_id", userId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
