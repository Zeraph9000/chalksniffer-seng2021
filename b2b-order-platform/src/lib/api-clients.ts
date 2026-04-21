/**
 * @deprecated This file exists only during the Phase 5 checkout migration.
 * Use `@/lib/chalksniffer-client`, `@/lib/despatch-client`, or `@/lib/invoice-client` instead.
 * This file will be deleted in Phase 5 once all callers have been migrated.
 */
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

async function getDespatchSessionId(): Promise<string> {
  const res = await fetch(`${DESPATCH_URL}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: process.env.DESPATCH_USERNAME!,
      email: process.env.DESPATCH_EMAIL || process.env.DESPATCH_USERNAME!,
      password: process.env.DESPATCH_PASSWORD!,
    }),
  });
  if (!res.ok) throw new Error("Failed to create Despatch session");
  const data = await res.json();
  return data.sessionId;
}

export function despatch() {
  const getHeaders = async () => {
    const sessionId = await getDespatchSessionId();
    return { sessionId };
  };
  return {
    get: async (path: string) => {
      const authHeaders = await getHeaders();
      return apiFetch(DESPATCH_URL, path, authHeaders);
    },
    post: async (path: string, body: unknown) => {
      const authHeaders = await getHeaders();
      return apiFetch(DESPATCH_URL, path, authHeaders, { method: "POST", body });
    },
    put: async (path: string, body: unknown) => {
      const authHeaders = await getHeaders();
      return apiFetch(DESPATCH_URL, path, authHeaders, { method: "PUT", body });
    },
    delete: async (path: string) => {
      const authHeaders = await getHeaders();
      return apiFetch(DESPATCH_URL, path, authHeaders, { method: "DELETE" });
    },
  };
}

export function lastminutepush() {
  const authHeaders = { "X-API-Key": process.env.LASTMINUTEPUSH_API_KEY! };
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
