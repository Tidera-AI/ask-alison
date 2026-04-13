import { getOrCreateSessionUserId } from "@/lib/session/anonymous";

// Vote functionality is not yet implemented — return empty arrays
// to prevent client-side JSON parsing errors.

export function GET() {
  return Response.json([]);
}

export async function PATCH(request: Request) {
  await getOrCreateSessionUserId();

  const body = await request.json();
  const { chatId, messageId, isUpvoted } = body;

  if (!chatId || !messageId || typeof isUpvoted !== "boolean") {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  // Stub: voting not persisted yet
  return Response.json({ success: true });
}
