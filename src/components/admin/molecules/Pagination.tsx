"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  loading?: boolean;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, loading, onChange }: PaginationProps) {
  if (loading || totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1.5 mt-6">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 transition-colors"
        style={{ color: "#6c6a64" }}
        onMouseEnter={(e) => {
          if (page !== 1) (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className="w-8 h-8 rounded-lg text-sm font-medium transition-all"
          style={
            p === page
              ? { background: "#cc785c", color: "#fff" }
              : { color: "#6c6a64", background: "transparent" }
          }
          onMouseEnter={(e) => {
            if (p !== page)
              (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
          }}
          onMouseLeave={(e) => {
            if (p !== page)
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          }}
        >
          {p}
        </button>
      ))}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 transition-colors"
        style={{ color: "#6c6a64" }}
        onMouseEnter={(e) => {
          if (page !== totalPages)
            (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
