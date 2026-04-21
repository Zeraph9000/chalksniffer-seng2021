import crypto from "crypto";

const BASE_URL = process.env.DESPATCH_BASE_URL || "https://devex.cloud.tcore.network";
const API_KEY = process.env.DESPATCH_API_KEY || "";

type Json = Record<string, unknown>;

function mockUuid(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(6).toString("hex")}`;
}

export const despatch = {
  async createDespatchAdvice(advice: Json): Promise<{ ok: true; uuid: string } | { ok: false; status: number }> {
    if (process.env.MOCK_EXTERNAL === "1") return { ok: true, uuid: mockUuid("despatch-mock") };
    const res = await fetch(`${BASE_URL}/despatch-advice`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Api-Key": API_KEY },
      body: JSON.stringify(advice),
    });
    if (!res.ok) return { ok: false, status: res.status };
    const data = await res.json().catch(() => ({}));
    const uuid = (data as { uuid?: string }).uuid;
    if (!uuid) return { ok: false, status: 502 };
    return { ok: true, uuid };
  },
  async createReceiptAdvice(advice: Json): Promise<{ ok: true; uuid: string } | { ok: false; status: number }> {
    if (process.env.MOCK_EXTERNAL === "1") return { ok: true, uuid: mockUuid("receipt-mock") };
    const res = await fetch(`${BASE_URL}/receipt-advice`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Api-Key": API_KEY },
      body: JSON.stringify(advice),
    });
    if (!res.ok) return { ok: false, status: res.status };
    const data = await res.json().catch(() => ({}));
    const uuid = (data as { uuid?: string }).uuid;
    if (!uuid) return { ok: false, status: 502 };
    return { ok: true, uuid };
  },
};
