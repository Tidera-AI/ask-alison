import { type NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGIN =
  process.env.ALLOWED_ORIGIN ?? "https://elevateetiquette.com";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const origin = request.headers.get("origin");

  // CORS for widget iframe
  if (origin === ALLOWED_ORIGIN) {
    response.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  // Handle preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: response.headers,
    });
  }

  return response;
}

export const proxyConfig = {
  matcher: ["/api/:path*", "/widget/:path*"],
  runtime: "nodejs",
};
