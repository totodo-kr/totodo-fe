"use client";

import { Spinner, EmptyState } from "../atoms";

interface TableColumn {
  label: string;
  className?: string;
}

interface AdminTableProps {
  columns: TableColumn[];
  gridTemplateColumns: string;
  loading: boolean;
  isEmpty: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
  px?: string;
}

export default function AdminTable({
  columns,
  gridTemplateColumns,
  loading,
  isEmpty,
  emptyMessage,
  children,
  px = "px-5",
}: AdminTableProps) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e6dfd8" }}>
      <div
        className={`grid items-center ${px} py-3 text-xs font-semibold uppercase tracking-wide border-b`}
        style={{
          gridTemplateColumns,
          background: "#efe9de",
          color: "#6c6a64",
          borderColor: "#e6dfd8",
        }}
      >
        {columns.map((col, i) => (
          <span key={i} className={col.className}>
            {col.label}
          </span>
        ))}
      </div>

      <div style={{ background: "#faf9f5" }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : isEmpty ? (
          <EmptyState message={emptyMessage} />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
