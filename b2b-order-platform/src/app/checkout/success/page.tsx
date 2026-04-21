"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Success() {
  const params = useSearchParams();
  const orderId = params.get("orderId") || "";
  const token = params.get("t");
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setUrl(`${window.location.origin}/orders/${orderId}${token ? `?t=${token}` : ""}`);
  }, [orderId, token]);

  return (
    <main className="max-w-xl mx-auto p-8 text-center">
      <div className="text-5xl mb-4">✓</div>
      <h1 className="text-3xl font-bold mb-2">Order placed!</h1>
      <p className="text-gray-600 mb-6">Order <code>{orderId}</code> — paid, awaiting despatch.</p>

      {token && (
        <div className="border-2 border-dashed rounded p-4 mb-6 bg-yellow-50">
          <p className="font-medium mb-2">Your tracking link:</p>
          <div className="flex gap-2">
            <input readOnly value={url} className="flex-1 border rounded px-2 py-1 text-sm" />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(url);
                setCopied(true);
              }}
              className="px-3 py-1 border rounded"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Save this link — you&apos;ll use it to confirm receipt when your order arrives. In production this would also be emailed to you.
          </p>
        </div>
      )}

      <a href={`/orders/${orderId}${token ? `?t=${token}` : ""}`} className="inline-block px-6 py-3 bg-black text-white rounded">
        View order status
      </a>
    </main>
  );
}
