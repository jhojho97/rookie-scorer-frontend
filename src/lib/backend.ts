import "server-only";

/**
 * Server-side helper to reach the FastAPI backend with the secret X-API-Key.
 * ONLY imported by route handlers — never by client components.
 */
const BASE = process.env.BACKEND_API_URL ?? "https://rookie-scorer-api.onrender.com";
const TOKEN = process.env.BACKEND_API_TOKEN ?? "";

/** The backend origin. Safe to hand to the browser (it is a public URL); the
 * API TOKEN is what must stay server-side. Needed so the client can upload
 * files directly to the backend and skip Vercel's 4.5MB body limit. */
export function backendBaseUrl() {
  return BASE;
}

export interface BackendCall {
  path: string;
  method?: "GET" | "POST";
  body?: BodyInit;
  // Render free tier cold-starts (~50s); allow a generous timeout.
  timeoutMs?: number;
  /** Extra headers, e.g. X-User-Id for per-user spend metering. */
  headers?: Record<string, string>;
}

export async function callBackend({
  path,
  method = "GET",
  body,
  timeoutMs = 130_000,
  headers = {},
}: BackendCall) {
  if (!TOKEN) {
    return Response.json({ error: "Server missing BACKEND_API_TOKEN." }, { status: 500 });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { "X-API-Key": TOKEN, ...headers },
      body,
      signal: controller.signal,
      cache: "no-store",
    });
    // Stream the backend's JSON straight back, preserving its status code.
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch (e) {
    const aborted = (e as Error).name === "AbortError";
    return Response.json(
      {
        error: aborted
          ? "Backend timed out. It may be waking from sleep — try again in a minute."
          : `Backend unreachable: ${(e as Error).message}`,
        cold_start: aborted,
      },
      { status: 504 },
    );
  } finally {
    clearTimeout(timer);
  }
}
