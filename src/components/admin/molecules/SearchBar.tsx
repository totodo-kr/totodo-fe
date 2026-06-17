"use client";

import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "검색",
  className,
}: SearchBarProps) {
  return (
    <form onSubmit={onSubmit} className={`relative flex-1 max-w-xs ${className ?? ""}`}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
        style={{ color: "#8e8b82" }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-9 pr-4 rounded-lg text-sm border outline-none transition-all"
        style={{ background: "#efe9de", borderColor: "#e6dfd8", color: "#141413" }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
      />
    </form>
  );
}
