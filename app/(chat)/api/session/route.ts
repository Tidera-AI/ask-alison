import { getOrCreateUser } from "@/lib/db/queries";
import { getOrCreateSessionUserId } from "@/lib/session/anonymous";

export async function GET() {
  const userId = await getOrCreateSessionUserId();
  const user = await getOrCreateUser(userId);

  return Response.json({
    hasEmail: Boolean(user.email),
  });
}
