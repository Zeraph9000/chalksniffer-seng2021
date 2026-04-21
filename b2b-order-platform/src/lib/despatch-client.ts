import crypto from "crypto";

/**
 * DevEx Despatch V2 client.
 * Base URL default: https://devex.cloud.tcore.network
 * Endpoint: POST /api/v1/despatch/create with RAW UBL ORDER XML body, Api-Key header.
 * V2 accepts an Order document and generates the Despatch Advice server-side.
 * Response: { success: boolean, adviceIds: string[], "executed-at": number }
 *
 * V2 has no receipt-advice endpoint — receipt handling is internal to this app.
 */
const BASE_URL = process.env.DESPATCH_BASE_URL || "https://devex.cloud.tcore.network";
const API_KEY = process.env.DESPATCH_API_KEY || "";

function mockUuid(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(6).toString("hex")}`;
}

export const despatch = {
  /**
   * Submit a UBL Order XML document to DevEx V2. Returns the first adviceId
   * on success. On failure returns the HTTP status and the upstream error
   * message when available (for diagnostics through the /despatch endpoint).
   */
  async createDespatchAdvice(
    xml: string,
  ): Promise<{ ok: true; uuid: string } | { ok: false; status: number; message?: string }> {
    if (process.env.MOCK_EXTERNAL === "1") {
      return { ok: true, uuid: mockUuid("despatch-mock") };
    }
    const res = await fetch(`${BASE_URL}/api/v1/despatch/create`, {
      method: "POST",
      headers: { "Content-Type": "application/xml", "Api-Key": API_KEY },
      body: xml,
    });
    const text = await res.text();
    if (!res.ok) {
      let message: string | undefined;
      try {
        const parsed = JSON.parse(text) as { errors?: string[]; message?: string };
        message = parsed.errors?.join("; ") ?? parsed.message;
      } catch {
        message = text.slice(0, 500);
      }
      return { ok: false, status: res.status, message };
    }
    let data: { adviceIds?: string[] } = {};
    try { data = JSON.parse(text) as { adviceIds?: string[] }; } catch { /* ignore */ }
    const uuid = data.adviceIds?.[0];
    if (!uuid) return { ok: false, status: 502, message: "adviceIds missing from DevEx response" };
    return { ok: true, uuid };
  },
};
