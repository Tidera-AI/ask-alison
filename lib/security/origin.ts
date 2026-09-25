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

/**
 * This project's Vercel preview deployments, e.g.
 * ask-alison-<hash>-elevateetiquettes-projects.vercel.app. The team suffix is
 * reserved by Vercel, so unlike a bare `*.vercel.app` match, nobody else can
 * deploy a site that passes this check.
 */
const PREVIEW_HOST_PREFIX = "ask-alison-";
const PREVIEW_HOST_SUFFIX = "-elevateetiquettes-projects.vercel.app";

function isProjectPreviewHost(hostname: string): boolean {
  return (
    hostname.startsWith(PREVIEW_HOST_PREFIX) &&
    hostname.endsWith(PREVIEW_HOST_SUFFIX)
  );
}

function isAllowedHost(hostname: string): boolean {
  return allowedHosts().has(hostname) || isProjectPreviewHost(hostname);
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
