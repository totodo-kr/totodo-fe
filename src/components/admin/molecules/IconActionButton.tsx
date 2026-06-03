"use client";

import { Spinner } from "../atoms";

interface IconActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  loading?: boolean;
  variant?: "default" | "danger";
  iconSize?: "sm" | "md";
}

const HOVER_COLORS: Record<string, string> = {
  default: "#cc785c",
  danger: "#c64545",
};

const SPINNER_SIZES: Record<string, "xs" | "sm"> = {
  sm: "xs",
  md: "sm",
};

export default function IconActionButton({
  icon,
  loading,
  variant = "default",
  iconSize = "md",
  className,
  ...props
}: IconActionButtonProps) {
  const hoverColor = HOVER_COLORS[variant];
  const spinnerColor = variant === "danger" ? "#c64545" : "#cc785c";
  const padding = iconSize === "sm" ? "p-1" : "p-1.5";

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`${padding} rounded-lg transition-colors disabled:opacity-40 ${className ?? ""}`}
      style={{ color: "#8e8b82", background: "transparent", ...props.style }}
      onMouseEnter={(e) => {
        if (!loading && !props.disabled) {
          (e.currentTarget as HTMLButtonElement).style.color = hoverColor;
          (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = "#8e8b82";
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      {loading ? <Spinner size={SPINNER_SIZES[iconSize]} color={spinnerColor} /> : icon}
    </button>
  );
}
