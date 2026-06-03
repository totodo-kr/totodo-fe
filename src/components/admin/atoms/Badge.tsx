"use client";

interface BadgeProps {
  children: React.ReactNode;
  bg: string;
  color: string;
  className?: string;
}

export default function Badge({ children, bg, color, className }: BadgeProps) {
  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${className ?? ""}`}
      style={{ background: bg, color }}
    >
      {children}
    </span>
  );
}
