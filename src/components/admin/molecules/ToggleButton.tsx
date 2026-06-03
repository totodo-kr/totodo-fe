"use client";

import { Spinner } from "../atoms";

interface ToggleButtonProps {
  active: boolean;
  pending: boolean;
  activeLabel: React.ReactNode;
  inactiveLabel: React.ReactNode;
  activeColor: string;
  onClick: () => void;
  className?: string;
}

export default function ToggleButton({
  active,
  pending,
  activeLabel,
  inactiveLabel,
  activeColor,
  onClick,
  className,
}: ToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${className ?? ""}`}
      style={
        active
          ? { borderColor: activeColor, color: activeColor, background: "transparent" }
          : { borderColor: "#e6dfd8", color: "#8e8b82", background: "transparent" }
      }
      onMouseEnter={(e) => {
        if (!pending) (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      {pending ? (
        <Spinner size="xs" color={active ? activeColor : "#8e8b82"} />
      ) : active ? (
        activeLabel
      ) : (
        inactiveLabel
      )}
    </button>
  );
}
