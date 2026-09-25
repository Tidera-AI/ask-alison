const DEFAULT_ALLOWED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "elevateetiquette.com",
  "www.elevateetiquette.com",
  "ask.elevateetiquette.com",
  "ask-alison-six.vercel.app",
];

function allowedHosts(): Set<string> {
  const hosts = new Set(DEFAULT_ALLOWED_HOSTS);
  const fromEnv = process.env.ALLOWED_ORIGIN;
  if (fromEnv) {
    try {
      hosts.add(new URL(fromEnv).hostname);
    } catch {
      return hosts;
    }
  }
  return hosts;
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/**
 * Allowed when the caller's origin is this deployment itself (the chat UI,
 * including inside the widget iframe, is served by the app, so its requests
 * are same-origin on every production and preview URL) or an exact
 * allowlisted host. Browsers don't let a page forge Origin/Referer, so a
 * cross-site page can't pass. Hostname patterns such as `*.vercel.app` are
 * deliberately not trusted: anyone can deploy there.
 */
function isAllowedSource(source: URL, requestHost: string | null): boolean {
  // Same-origin compares host:port; allowlisted names are domains we
  // control, so any port on them is fine (e.g. localhost:3000).
  return source.host === requestHost || allowedHosts().has(source.hostname);
}

export function isAllowedMutatingOrigin(headers: Headers): boolean {
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  const requestHost = headers.get("host")?.toLowerCase() ?? null;
  const source = headers.get("origin") ?? headers.get("referer");
  if (!source) {
    return false;
  }

  const url = parseUrl(source);
  return url !== null && isAllowedSource(url, requestHost);
}
