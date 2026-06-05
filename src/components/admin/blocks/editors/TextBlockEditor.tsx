"use client";

import RichTextEditor from "../RichTextEditor";
import type { TextBlockData } from "@/types/blocks";

interface Props {
  data: TextBlockData;
  onChange: (data: TextBlockData) => void;
}

export default function TextBlockEditor({ data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium" style={{ color: "#141413" }}>내용</label>
      <RichTextEditor
        value={data.content}
        onChange={(html) => onChange({ content: html })}
      />
    </div>
  );
}
