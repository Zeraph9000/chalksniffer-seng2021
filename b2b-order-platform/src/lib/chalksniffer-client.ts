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
    if (process.env.MOCK_EXTERNAL === "1") {
      // Synthesize a minimal order for seeded/mocked orders that don't exist
      // upstream. Enough shape for buildUblOrderXml to emit a valid document.
      return {
        id,
        issueDate: new Date().toISOString().split("T")[0],
        documentCurrencyCode: "AUD",
        orderLines: [
          {
            lineItem: {
              id: "1",
              quantity: 1,
              unitCode: "each",
              price: { priceAmount: 1, currencyID: "AUD" },
              item: { name: "Seeded item", description: "Mock line from MOCK_EXTERNAL" },
            },
          },
        ],
      };
    }
    const res = await call("GET", `/orders/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    return res.json();
  },
  async getOrderXml(id: string): Promise<string | null> {
    if (process.env.MOCK_EXTERNAL === "1") return `<?xml version="1.0"?><Order><ID>${id}</ID></Order>`;
    const res = await fetch(`${BASE_URL}/orders/${encodeURIComponent(id)}/xml`, { headers: { Authorization: API_KEY } });
    if (!res.ok) return null;
    return res.text();
  },
  async getRecommend(): Promise<Json | null> {
    if (process.env.MOCK_EXTERNAL === "1") return { recommendations: [] };
    const res = await call("GET", "/orders/recommend");
    if (!res.ok) return null;
    return res.json();
  },
  async listRecurring(userId: string): Promise<Json[] | null> {
    if (process.env.MOCK_EXTERNAL === "1") return [];
    const res = await call("GET", `/orders/recurring?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : (data.recurringOrders ?? []);
  },
  async getRecurring(id: string): Promise<Json | null> {
    if (process.env.MOCK_EXTERNAL === "1") return { id, frequency: "Weekly", startDate: new Date().toISOString().split("T")[0] };
    const res = await call("GET", `/orders/recurring/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    return res.json();
  },
  async updateRecurring(id: string, patch: Json): Promise<{ ok: boolean; status: number; body: unknown }> {
    const res = await call("PATCH", `/orders/recurring/${encodeURIComponent(id)}`, patch);
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  },
  async deleteRecurring(id: string): Promise<{ ok: boolean; status: number }> {
    const res = await call("DELETE", `/orders/recurring/${encodeURIComponent(id)}`);
    return { ok: res.ok, status: res.status };
  },
};
