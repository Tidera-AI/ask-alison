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

function hostFromUrl(value: string): string | null {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

function isAllowedHost(hostname: string): boolean {
  const allowed = allowedHosts();
  return allowed.has(hostname) || hostname.endsWith(".vercel.app");
}

export function isAllowedMutatingOrigin(headers: Headers): boolean {
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  const origin = headers.get("origin");
  if (origin) {
    const host = hostFromUrl(origin);
    return host !== null && isAllowedHost(host);
  }

  const referer = headers.get("referer");
  if (referer) {
    const host = hostFromUrl(referer);
    return host !== null && isAllowedHost(host);
  }

  return false;
}
