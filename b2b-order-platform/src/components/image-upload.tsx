"use client";
import { useRef, useState } from "react";
import { transformedImageUrl, type ImageKind } from "@/lib/image-url";

type Props = {
  kind: ImageKind;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  /** Visible label in the empty state */
  label?: string;
};

export function ImageUpload({ kind, value, onChange, label }: Props) {
  const [state, setState] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File) {
    setState("uploading");
    setError(null);
    const form = new FormData();
    form.append("kind", kind);
    form.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setState("error");
        setError(data.message ?? data.error ?? "Upload failed");
        return;
      }
      onChange(data.url);
      setState("idle");
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  }

  const previewUrl = value ? transformedImageUrl(value, kind) : null;

  return (
    <div className="border rounded p-3">
      <div className="flex items-center gap-3">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="w-20 h-20 object-cover rounded bg-gray-100" />
        ) : (
          <div className="w-20 h-20 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs text-center px-1">
            {label ?? "No image"}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={state === "uploading"}
            className="px-3 py-1.5 border rounded text-sm disabled:opacity-50"
          >
            {state === "uploading" ? "Uploading…" : value ? "Replace" : "Upload"}
          </button>
          {value && state !== "uploading" && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs text-red-600 underline text-left"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      {state === "error" && error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
