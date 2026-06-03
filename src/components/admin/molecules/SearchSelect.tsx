"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";

export interface SearchSelectOption {
  value: string;
  label: string;
  prefix?: string;
}

interface SearchSelectProps {
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchSelect({
  options,
  value,
  onChange,
  placeholder = "선택",
  className,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = query
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          o.value.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className={`relative ${className ?? "w-64"}`}>
      {/* 트리거 */}
      <button
        onClick={handleOpen}
        className="w-full h-10 px-3 rounded-lg text-sm border flex items-center justify-between gap-2 transition-all"
        style={{
          background: "#efe9de",
          borderColor: open ? "#cc785c" : "#e6dfd8",
          color: "#141413",
        }}
      >
        <span className="flex items-center gap-1.5 min-w-0 truncate">
          {selected ? (
            <>
              {selected.prefix && (
                <span
                  className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{ background: "#e6dfd8", color: "#cc785c" }}
                >
                  {selected.prefix}
                </span>
              )}
              <span className="truncate">{selected.label}</span>
            </>
          ) : (
            <span style={{ color: "#8e8b82" }}>{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          style={{ color: "#8e8b82" }}
        />
      </button>

      {/* 드롭다운 */}
      {open && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 rounded-xl border shadow-lg overflow-hidden"
          style={{ background: "#faf9f5", borderColor: "#e6dfd8" }}
        >
          {/* 검색 인풋 */}
          <div className="p-2 border-b" style={{ borderColor: "#e6dfd8" }}>
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                style={{ color: "#8e8b82" }}
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="검색..."
                className="w-full h-8 pl-8 pr-3 rounded-lg text-xs border outline-none"
                style={{ background: "#efe9de", borderColor: "#e6dfd8", color: "#141413" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setOpen(false);
                    setQuery("");
                  }
                  if (e.key === "Enter" && filtered.length > 0) {
                    handleSelect(filtered[0].value);
                  }
                }}
              />
            </div>
          </div>

          {/* 옵션 목록 */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "#8e8b82" }}>
                결과 없음
              </p>
            ) : (
              filtered.map((option) => {
                const isActive = option.value === value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors"
                    style={
                      isActive
                        ? { background: "#cc785c20", color: "#cc785c" }
                        : { color: "#252523", background: "transparent" }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive)
                        (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                    {option.prefix && (
                      <span
                        className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{ background: "#efe9de", color: "#cc785c" }}
                      >
                        {option.prefix}
                      </span>
                    )}
                    <span>{option.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
