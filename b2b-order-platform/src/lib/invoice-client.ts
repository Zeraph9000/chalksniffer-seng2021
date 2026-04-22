import crypto from "crypto";

const BASE_URL = (process.env.INVOICE_BASE_URL || "https://lastminutepush.one").replace(/\/+$/, "");
const API_KEY = process.env.INVOICE_API_KEY || "";

type Json = Record<string, unknown>;

function mockId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(6).toString("hex")}`;
}

export const invoiceApi = {
  async createInvoice(invoice: Json): Promise<{ ok: true; invoiceId: string } | { ok: false; status: number }> {
    if (process.env.MOCK_EXTERNAL === "1") return { ok: true, invoiceId: mockId("invoice-mock") };
    const res = await fetch(`${BASE_URL}/v1/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
      body: JSON.stringify(invoice),
    });
    if (!res.ok) return { ok: false, status: res.status };
    const data = (await res.json().catch(() => ({}))) as { invoice?: { invoice_id?: string }; invoice_id?: string };
    const invoiceId = data.invoice?.invoice_id ?? data.invoice_id;
    if (!invoiceId) return { ok: false, status: 502 };
    return { ok: true, invoiceId };
  },
  async getInvoice(id: string): Promise<Json | null> {
    if (process.env.MOCK_EXTERNAL === "1") return { invoice_id: id, status: "sent", mock: true };
    const res = await fetch(`${BASE_URL}/v1/invoices/${encodeURIComponent(id)}`, { headers: { "X-API-Key": API_KEY } });
    if (!res.ok) return null;
    return res.json();
  },
};
