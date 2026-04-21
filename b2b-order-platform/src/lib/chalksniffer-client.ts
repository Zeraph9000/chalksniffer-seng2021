const BASE_URL = process.env.CHALKSNIFFER_BASE_URL || "https://www.chalksniffer.com";
const API_KEY = process.env.CHALKSNIFFER_API_KEY || "";

type Json = Record<string, unknown>;

async function call(method: string, path: string, body?: Json): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export const chalksniffer = {
  async createOrder(order: Json): Promise<{ ok: true; data: Json } | { ok: false; status: number; body: unknown }> {
    const res = await call("POST", "/orders", order);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, body: data };
    return { ok: true, data };
  },
  async getOrder(id: string): Promise<Json | null> {
    const res = await call("GET", `/orders/${id}`);
    if (!res.ok) return null;
    return res.json();
  },
  async getOrderXml(id: string): Promise<string | null> {
    const res = await fetch(`${BASE_URL}/orders/${id}/xml`, { headers: { Authorization: API_KEY } });
    if (!res.ok) return null;
    return res.text();
  },
  async getRecommend(): Promise<Json | null> {
    const res = await call("GET", "/orders/recommend");
    if (!res.ok) return null;
    return res.json();
  },
};
