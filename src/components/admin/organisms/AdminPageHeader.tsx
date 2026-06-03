"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

interface ActionButton {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  action?: ActionButton;
}

const actionStyle = {
  background: "#cc785c",
  color: "#fff",
} as const;

export default function AdminPageHeader({ title, description, action }: AdminPageHeaderProps) {
  return (
    <div className={`${action ? "flex items-start justify-between" : ""} mb-8`}>
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "#141413" }}>
          {title}
        </h1>
        {description && (
          <p className="text-sm mt-1" style={{ color: "#6c6a64" }}>
            {description}
          </p>
        )}
      </div>

      {action &&
        (action.href ? (
          <Link
            href={action.href}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={actionStyle}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.background = "#a9583e")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.background = "#cc785c")
            }
          >
            {action.icon ?? <Plus className="w-4 h-4" />}
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={actionStyle}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = "#a9583e")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = "#cc785c")
            }
          >
            {action.icon ?? <Plus className="w-4 h-4" />}
            {action.label}
          </button>
        ))}
    </div>
  );
}
