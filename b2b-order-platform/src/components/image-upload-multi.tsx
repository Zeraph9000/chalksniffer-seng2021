"use client";
import { ImageUpload } from "./image-upload";

type Props = {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
};

export function ImageUploadMulti({ value, onChange, max = 8 }: Props) {
  function replaceAt(idx: number, url: string | null) {
    if (url === null) {
      onChange(value.filter((_, i) => i !== idx));
    } else {
      onChange(value.map((u, i) => (i === idx ? url : u)));
    }
  }

  function appendUrl(url: string | null) {
    if (url && value.length < max) onChange([...value, url]);
  }

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= value.length) return;
    const next = value.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {value.map((url, i) => (
        <div key={`${url}-${i}`} className="flex items-start gap-2">
          <div className="flex-1">
            <ImageUpload
              kind="product"
              value={url}
              onChange={(newUrl) => replaceAt(i, newUrl)}
              label={`Image ${i + 1}`}
            />
          </div>
          <div className="flex flex-col gap-1 pt-3">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="px-2 py-1 border rounded text-xs disabled:opacity-30">↑</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} className="px-2 py-1 border rounded text-xs disabled:opacity-30">↓</button>
          </div>
        </div>
      ))}
      {value.length < max && (
        <ImageUpload
          kind="product"
          value={null}
          onChange={appendUrl}
          label={value.length === 0 ? "Add first image" : `Add image ${value.length + 1} of ${max}`}
        />
      )}
      {value.length >= max && (
        <p className="text-xs text-gray-500">Maximum {max} images reached.</p>
      )}
    </div>
  );
}
