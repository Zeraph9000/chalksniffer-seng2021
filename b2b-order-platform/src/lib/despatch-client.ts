import crypto from "crypto";

/**
 * DevEx Despatch V2 client.
 * Base URL default: https://devex.cloud.tcore.network
 * Endpoint: POST /api/v1/despatch/create with RAW XML body, Api-Key header.
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
   * Submit a UBL Despatch Advice XML document to DevEx V2.
   * Returns the first adviceId on success, or an ok:false with status.
   */
  async createDespatchAdvice(
    xml: string,
  ): Promise<{ ok: true; uuid: string } | { ok: false; status: number }> {
    if (process.env.MOCK_EXTERNAL === "1") {
      return { ok: true, uuid: mockUuid("despatch-mock") };
    }
    const res = await fetch(`${BASE_URL}/api/v1/despatch/create`, {
      method: "POST",
      headers: { "Content-Type": "application/xml", "Api-Key": API_KEY },
      body: xml,
    });
    if (!res.ok) return { ok: false, status: res.status };
    const data = (await res.json().catch(() => ({}))) as { adviceIds?: string[] };
    const uuid = data.adviceIds?.[0];
    if (!uuid) return { ok: false, status: 502 };
    return { ok: true, uuid };
  },
};
