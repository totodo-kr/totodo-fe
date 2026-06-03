"use client";

import { Spinner } from "../atoms";

interface ToggleButtonProps {
  active: boolean;
  pending: boolean;
  activeLabel: React.ReactNode;
  inactiveLabel: React.ReactNode;
  activeColor: string;
  activeBg?: string;
  inactiveBg?: string;
  onClick: () => void;
  pill?: boolean;
  className?: string;
}

export default function ToggleButton({
  active,
  pending,
  activeLabel,
  inactiveLabel,
  activeColor,
  activeBg = "transparent",
  inactiveBg = "transparent",
  onClick,
  pill,
  className,
}: ToggleButtonProps) {
  const shape = pill ? "rounded-full" : "rounded-lg";

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 ${shape} border transition-all disabled:opacity-50 ${className ?? ""}`}
      style={
        active
          ? { borderColor: activeColor, color: activeColor, background: activeBg }
          : { borderColor: "#e6dfd8", color: "#8e8b82", background: inactiveBg }
      }
      onMouseEnter={(e) => {
        if (!pending) (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = active ? activeBg : inactiveBg;
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
