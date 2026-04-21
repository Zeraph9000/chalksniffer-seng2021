import { NextResponse } from "next/server";
import { getBuyerSessionOrNull } from "@/lib/buyer-session";
import { chalksniffer } from "@/lib/chalksniffer-client";

type RecurringRaw = { storeId?: string; order?: { storeId?: string; sellerSupplierParty?: { party?: { partyIdentification?: string } } }; [k: string]: unknown };

export async function GET() {
  const buyer = await getBuyerSessionOrNull();
  if (!buyer) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const raw = (await chalksniffer.listRecurring(buyer.userId)) as RecurringRaw[] | null;
  if (!raw) return NextResponse.json([]);
  // Normalize: ensure each row has a top-level `storeId` for client-side filter.
  const rows = raw.map((r) => ({
    ...r,
    storeId: r.storeId ?? r.order?.storeId ?? r.order?.sellerSupplierParty?.party?.partyIdentification ?? null,
  }));
  return NextResponse.json(rows);
}
