"use client";

interface EmptyStateProps {
  message?: string;
}

export default function EmptyState({ message = "데이터가 없습니다." }: EmptyStateProps) {
  return (
    <p className="text-center py-12 text-sm" style={{ color: "#8e8b82" }}>
      {message}
    </p>
  );
}
