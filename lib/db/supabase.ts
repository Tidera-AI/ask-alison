import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL environment variable");
}

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isLikelyJwt = (value: string) => value.split(".").length === 3;

if (!serviceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
}

if (
  serviceRoleKey === "your-service-role-key" ||
  serviceRoleKey === "****" ||
  !isLikelyJwt(serviceRoleKey)
) {
  throw new Error(
    "Invalid SUPABASE_SERVICE_ROLE_KEY. Set it to your Supabase project 'service_role' key (a JWT-looking value with 3 dot-separated parts)."
  );
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  serviceRoleKey
);
