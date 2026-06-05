import type { ActionButtonBlockData, ActionButton } from "@/types/blocks";

const ICON_MAP: Record<string, string> = {
  youtube: "▶",
  instagram: "📷",
  cart: "🛒",
  link: "🔗",
};

function alignClass(align?: string) {
  if (align === "left") return "justify-start";
  if (align === "right") return "justify-end";
  return "justify-center";
}

function buttonClass(style: ActionButton["style"]) {
  if (style === "primary")
    return "bg-[#cc785c] hover:bg-[#a9583e] text-white";
  if (style === "secondary")
    return "bg-[#efe9de] hover:bg-[#e6dfd8] text-[#141413]";
  return "border border-[#e6dfd8] hover:bg-[#efe9de] text-[#252523]";
}

export default function ActionButtonBlock({ data }: { data: ActionButtonBlockData }) {
  return (
    <div className={`flex flex-wrap gap-3 ${alignClass(data.align)}`}>
      {data.buttons.map((btn, i) => (
        <a
          key={i}
          href={btn.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-colors ${buttonClass(btn.style)}`}
        >
          {btn.icon && <span>{ICON_MAP[btn.icon] ?? ""}</span>}
          {btn.label}
        </a>
      ))}
    </div>
  );
}
