import { SessionData } from "./types";

const CHALKSNIFFER_URL = process.env.CHALKSNIFFER_API_URL!;
const DESPATCH_URL = process.env.DESPATCH_API_URL!;
const LASTMINUTEPUSH_URL = process.env.LASTMINUTEPUSH_API_URL!;

type FetchOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

async function apiFetch(
  baseUrl: string,
  path: string,
  authHeaders: Record<string, string>,
  options: FetchOptions = {}
): Promise<Response> {
  const { method = "GET", body, headers = {} } = options;
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function chalksniffer() {
  const authHeaders = { Authorization: `Bearer ${process.env.CHALKSNIFFER_API_KEY}` };
  return {
    get: (path: string) => apiFetch(CHALKSNIFFER_URL, path, authHeaders),
    post: (path: string, body: unknown) =>
      apiFetch(CHALKSNIFFER_URL, path, authHeaders, { method: "POST", body }),
    put: (path: string, body: unknown) =>
      apiFetch(CHALKSNIFFER_URL, path, authHeaders, { method: "PUT", body }),
    delete: (path: string) =>
      apiFetch(CHALKSNIFFER_URL, path, authHeaders, { method: "DELETE" }),
  };
}

export function despatch(session: SessionData) {
  const authHeaders = { sessionId: session.despatch.sessionId };
  return {
    get: (path: string) => apiFetch(DESPATCH_URL, path, authHeaders),
    post: (path: string, body: unknown) =>
      apiFetch(DESPATCH_URL, path, authHeaders, { method: "POST", body }),
    put: (path: string, body: unknown) =>
      apiFetch(DESPATCH_URL, path, authHeaders, { method: "PUT", body }),
    delete: (path: string) =>
      apiFetch(DESPATCH_URL, path, authHeaders, { method: "DELETE" }),
  };
}

export function lastminutepush(session: SessionData) {
  const authHeaders = { "X-API-Key": session.lastminutepush.apiKey };
  return {
    get: (path: string, headers?: Record<string, string>) =>
      apiFetch(LASTMINUTEPUSH_URL, path, authHeaders, { headers }),
    post: (path: string, body: unknown) =>
      apiFetch(LASTMINUTEPUSH_URL, path, authHeaders, { method: "POST", body }),
    put: (path: string, body: unknown) =>
      apiFetch(LASTMINUTEPUSH_URL, path, authHeaders, { method: "PUT", body }),
    delete: (path: string) =>
      apiFetch(LASTMINUTEPUSH_URL, path, authHeaders, { method: "DELETE" }),
  };
}
