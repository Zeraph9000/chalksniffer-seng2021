import Link from "next/link";
import { getBuyerSessionOrNull } from "@/lib/buyer-session";
import { Store } from "@/lib/types";

export async function StorefrontHeader({ store }: { store: Store }) {
  const buyer = await getBuyerSessionOrNull();
  const slug = store.slug ?? store.storeId;
  return (
    <header className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
        <Link href={`/store/${slug}`} className="font-bold text-lg">
          {store.storeName}
        </Link>
        <nav className="flex gap-4 text-sm ml-auto items-center">
          <Link href="/cart">Cart</Link>
          {buyer ? (
            <>
              <Link href={`/store/${slug}/orders`}>My orders</Link>
              <Link href={`/store/${slug}/recurring`}>Recurring</Link>
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="underline">Sign out</button>
              </form>
            </>
          ) : (
            <Link href={`/login?next=/store/${slug}`}>Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
