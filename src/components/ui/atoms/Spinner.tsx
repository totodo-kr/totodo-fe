"use client";

interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  color?: string;
}

const SIZE_MAP = {
  xs: { dim: "w-3 h-3", border: "border" },
  sm: { dim: "w-3.5 h-3.5", border: "border" },
  md: { dim: "w-5 h-5", border: "border-2" },
  lg: { dim: "w-7 h-7", border: "border-2" },
  xl: { dim: "w-8 h-8", border: "border-4" },
};

export default function Spinner({ size = "lg", color = "#a200cb" }: SpinnerProps) {
  const { dim, border } = SIZE_MAP[size];
  return (
    <div
      className={`${dim} ${border} border-t-transparent rounded-full animate-spin flex-shrink-0`}
      style={{ borderColor: color, borderTopColor: "transparent" }}
    />
  );
}
