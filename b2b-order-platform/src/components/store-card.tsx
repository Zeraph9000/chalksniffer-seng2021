import Link from "next/link";
import type { Store } from "@/lib/types";

export function StoreCard({ store }: { store: Store }) {
  return (
    <Link href={`/store/${store.slug ?? store.storeId}`} className="block border rounded-lg overflow-hidden hover:shadow-md">
      <div className="aspect-[3/1] bg-gray-100 relative">
        {store.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.bannerUrl} alt="" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="p-4 flex gap-3 items-center">
        {store.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.logoUrl} alt={store.storeName} className="w-12 h-12 rounded-full object-cover" />
        )}
        <div>
          <div className="font-semibold">{store.storeName}</div>
          <div className="text-sm text-gray-600">{store.category} · {store.location}</div>
          {store.status === "paused" && <div className="text-xs text-yellow-700">Paused</div>}
        </div>
      </div>
    </Link>
  );
}
