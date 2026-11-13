const DEFAULT_TIMEOUT_MS = 15_000;
const USER_AGENT = 'total/1.0';

export interface HttpRequestInit extends RequestInit {
  timeoutMs?: number;
}

export async function fetchText(
  url: string | URL,
  { timeoutMs = DEFAULT_TIMEOUT_MS, ...init }: HttpRequestInit = {},
): Promise<string> {
  const target = new URL(url);
  const label = `${init.method ?? 'GET'} ${target.host}${target.pathname}`;

  const headers = new Headers(init.headers);
  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', USER_AGENT);
  }

  let response: Response;
  try {
    response = await fetch(target, {
      ...init,
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new Error(`${label} failed: ${errorMessage(error)}`, {
      cause: error,
    });
  }

  const body = await response.text();
  if (!response.ok) {
    throw new Error(
      `${label} failed with ${response.status}: ${body.slice(0, 300)}`,
    );
  }
  return body;
}

export async function fetchJson<T>(
  url: string | URL,
  init?: HttpRequestInit,
): Promise<T> {
  return JSON.parse(await fetchText(url, init)) as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Not a number: ${String(value)}`);
  }
  return parsed;
}
