"use client";

export function ReplaceCartModal({
  open,
  currentStore,
  newStore,
  onCancel,
  onReplace,
}: {
  open: boolean;
  currentStore: string;
  newStore: string;
  onCancel: () => void;
  onReplace: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md">
        <h2 className="text-xl font-semibold mb-3">Replace cart?</h2>
        <p className="mb-4">
          You have items from <strong>{currentStore}</strong> in your cart.
          Add this item from <strong>{newStore}</strong>? Your current cart will be replaced.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 border rounded">Cancel</button>
          <button onClick={onReplace} className="px-4 py-2 bg-red-600 text-white rounded">Replace cart</button>
        </div>
      </div>
    </div>
  );
}
