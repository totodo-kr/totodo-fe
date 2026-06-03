"use client";

interface ResultCountProps {
  total: number;
  unit?: string;
}

export default function ResultCount({ total, unit = "개" }: ResultCountProps) {
  return (
    <span className="text-sm" style={{ color: "#6c6a64" }}>
      총{" "}
      <span className="font-semibold" style={{ color: "#141413" }}>
        {total.toLocaleString()}
      </span>
      {unit}
    </span>
  );
}
