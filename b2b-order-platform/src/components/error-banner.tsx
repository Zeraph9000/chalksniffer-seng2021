import { AlertCircle, X } from "lucide-react";

export function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  if (!message) return null;

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
      <p className="flex-1 text-sm text-red-700">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 text-red-400 hover:text-red-600"
          aria-label="Dismiss error"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
