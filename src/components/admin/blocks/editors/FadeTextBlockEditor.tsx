"use client";

import RichTextEditor from "../RichTextEditor";
import type { FadeTextBlockData } from "@/types/blocks";

interface Props {
  data: FadeTextBlockData;
  onChange: (data: FadeTextBlockData) => void;
}

export default function FadeTextBlockEditor({ data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" style={{ color: "#141413" }}>내용</label>
        <RichTextEditor
          value={data.content}
          onChange={(html) => onChange({ ...data, content: html })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "#141413" }}>
          지연 시간 (ms)
        </label>
        <input
          type="number"
          min={0}
          max={2000}
          step={100}
          value={data.delay ?? 0}
          onChange={(e) => onChange({ ...data, delay: Number(e.target.value) })}
          placeholder="0"
          className="w-40 h-10 rounded-lg px-3 text-sm outline-none border transition-colors"
          style={{ background: "#efe9de", borderColor: "#e6dfd8", color: "#141413" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
        />
        <p className="text-xs" style={{ color: "#8e8b82" }}>
          스크롤로 화면에 들어온 후 몇 ms 뒤에 나타날지 설정합니다.
        </p>
      </div>
    </div>
  );
}
