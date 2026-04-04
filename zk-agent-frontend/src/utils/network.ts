const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname.toLowerCase());
}

function parseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function getSafeApiBase(apiUrl: string | undefined): string {
  const fallback = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  if (!apiUrl) return fallback;

  const parsed = parseUrl(apiUrl);
  if (!parsed) return fallback;

  const isSecureScheme = parsed.protocol === 'https:' || parsed.protocol === 'http:';
  if (!isSecureScheme) return fallback;

  if (parsed.protocol === 'http:' && !isLocalHost(parsed.hostname)) {
    return fallback;
  }

  return parsed.origin;
}

export function getSafeWsUrl(wsUrl: string | undefined): string {
  const fallback =
    typeof window !== 'undefined'
      ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`
      : 'ws://localhost:3000/ws';

  if (!wsUrl) return fallback;

  const parsed = parseUrl(wsUrl);
  if (!parsed) return fallback;

  const isWsScheme = parsed.protocol === 'wss:' || parsed.protocol === 'ws:';
  if (!isWsScheme) return fallback;

  if (parsed.protocol === 'ws:' && !isLocalHost(parsed.hostname)) {
    return fallback;
  }

  return parsed.toString();
}