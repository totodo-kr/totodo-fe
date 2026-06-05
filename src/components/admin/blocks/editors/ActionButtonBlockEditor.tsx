"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ActionButtonBlockData, ActionButton } from "@/types/blocks";

interface Props {
  data: ActionButtonBlockData;
  onChange: (data: ActionButtonBlockData) => void;
}

const ICONS = [
  { value: "", label: "없음" },
  { value: "youtube", label: "▶ YouTube" },
  { value: "instagram", label: "📷 Instagram" },
  { value: "cart", label: "🛒 구매" },
  { value: "link", label: "🔗 링크" },
] as const;

const STYLES = [
  { value: "primary", label: "주요 (브랜드색)" },
  { value: "secondary", label: "보조 (베이지)" },
  { value: "outline", label: "아웃라인" },
] as const;

const inputCls = "w-full h-9 rounded-lg px-3 text-sm outline-none border transition-colors";
const inputStyle = { background: "#efe9de", borderColor: "#e6dfd8", color: "#141413" };

function SelectField<T extends string>({
  label, value, options, onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: "#6c6a64" }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={inputCls}
        style={inputStyle}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export default function ActionButtonBlockEditor({ data, onChange }: Props) {
  const update = (i: number, patch: Partial<ActionButton>) => {
    const buttons = data.buttons.map((b, idx) => idx === i ? { ...b, ...patch } : b);
    onChange({ ...data, buttons });
  };

  const add = () => {
    onChange({ ...data, buttons: [...data.buttons, { label: "", href: "", style: "primary" }] });
  };

  const remove = (i: number) => {
    onChange({ ...data, buttons: data.buttons.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 정렬 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "#141413" }}>버튼 정렬</label>
        <div className="flex gap-2">
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => onChange({ ...data, align: a })}
              className="px-4 py-1.5 rounded-lg text-sm border transition-colors"
              style={{
                borderColor: data.align === a ? "#cc785c" : "#e6dfd8",
                background: data.align === a ? "#cc785c" : "transparent",
                color: data.align === a ? "#fff" : "#6c6a64",
              }}
            >
              {a === "left" ? "왼쪽" : a === "center" ? "가운데" : "오른쪽"}
            </button>
          ))}
        </div>
      </div>

      {/* 버튼 목록 */}
      <div className="flex flex-col gap-3">
        {data.buttons.map((btn, i) => (
          <div
            key={i}
            className="rounded-xl p-4 flex flex-col gap-3 border"
            style={{ borderColor: "#e6dfd8", background: "#faf9f5" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: "#252523" }}>버튼 {i + 1}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "#c64545" }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: "#6c6a64" }}>레이블</label>
              <input
                type="text"
                value={btn.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="버튼에 표시할 텍스트"
                className={inputCls}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: "#6c6a64" }}>링크 URL</label>
              <input
                type="text"
                value={btn.href}
                onChange={(e) => update(i, { href: e.target.value })}
                placeholder="https://..."
                className={inputCls}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="아이콘"
                value={btn.icon ?? ""}
                options={ICONS as unknown as readonly { value: string; label: string }[]}
                onChange={(v) => update(i, { icon: v as ActionButton["icon"] })}
              />
              <SelectField
                label="스타일"
                value={btn.style}
                options={STYLES}
                onChange={(v) => update(i, { style: v })}
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-colors w-fit"
        style={{ borderColor: "#e6dfd8", color: "#6c6a64" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#cc785c"; (e.currentTarget as HTMLButtonElement).style.color = "#cc785c"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e6dfd8"; (e.currentTarget as HTMLButtonElement).style.color = "#6c6a64"; }}
      >
        <Plus className="w-4 h-4" />
        버튼 추가
      </button>
    </div>
  );
}
