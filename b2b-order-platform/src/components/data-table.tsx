"use client";

import { useState } from "react";

type Column<T> = {
  key: keyof T;
  label: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    onPageChange: (offset: number) => void;
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  pagination,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const aVal = String(a[sortKey] ?? "");
        const bVal = String(b[sortKey] ?? "");
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      })
    : data;

  function handleSort(key: keyof T) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="card overflow-hidden">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-surface-border">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                onClick={() => handleSort(col.key)}
                className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase text-ink-faint hover:text-ink-muted"
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="ml-1 text-accent-primary">
                    {sortDir === "asc" ? "\u2191" : "\u2193"}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-surface-border/50 ${
                onRowClick
                  ? "cursor-pointer hover:bg-surface-hover"
                  : ""
              }`}
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className="whitespace-nowrap px-4 py-3.5 text-sm text-ink"
                >
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {pagination && (
        <div className="flex items-center justify-between border-t border-surface-border px-4 py-3">
          <span className="font-mono text-xs text-ink-faint">
            {pagination.offset + 1}&ndash;{Math.min(pagination.offset + pagination.limit, pagination.total)}{" "}
            of {pagination.total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => pagination.onPageChange(Math.max(0, pagination.offset - pagination.limit))}
              disabled={pagination.offset === 0}
              className="btn-ghost py-1.5 text-xs"
            >
              Previous
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.offset + pagination.limit)}
              disabled={pagination.offset + pagination.limit >= pagination.total}
              className="btn-ghost py-1.5 text-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
