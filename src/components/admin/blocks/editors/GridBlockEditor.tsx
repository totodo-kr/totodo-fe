"use client";

import type { GridBlockData, CellBlock, CellBlockType } from "@/types/blocks";
import { CELL_TYPE_LABELS } from "@/types/blocks";
import TextBlockEditor from "./TextBlockEditor";
import FadeTextBlockEditor from "./FadeTextBlockEditor";
import ImageBlockEditor from "./ImageBlockEditor";
import VideoBlockEditor from "./VideoBlockEditor";
import ActionButtonBlockEditor from "./ActionButtonBlockEditor";

interface Props {
  data: GridBlockData;
  onChange: (data: GridBlockData) => void;
}

const DEFAULT_DATA: Record<CellBlockType, CellBlock["data"]> = {
  text: { content: "" },
  image: { src: "", alt: "" },
  fade_text: { content: "", delay: 0 },
  video: { url: "", type: "youtube" },
  action_button: { buttons: [], align: "center" },
};

function CellEditor({ cell, onChange }: { cell: CellBlock; onChange: (c: CellBlock) => void }) {
  const handleTypeChange = (type: CellBlockType) => {
    onChange({ type, data: DEFAULT_DATA[type] } as CellBlock);
  };

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border" style={{ borderColor: "#e6dfd8", background: "#faf9f5" }}>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: "#6c6a64" }}>셀 유형</label>
        <select
          value={cell.type}
          onChange={(e) => handleTypeChange(e.target.value as CellBlockType)}
          className="h-9 rounded-lg px-3 text-sm outline-none border transition-colors w-full"
          style={{ background: "#efe9de", borderColor: "#e6dfd8", color: "#141413" }}
        >
          {(Object.keys(CELL_TYPE_LABELS) as CellBlockType[]).map((t) => (
            <option key={t} value={t}>{CELL_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {cell.type === "text" && (
        <TextBlockEditor data={cell.data} onChange={(d) => onChange({ type: "text", data: d })} />
      )}
      {cell.type === "fade_text" && (
        <FadeTextBlockEditor data={cell.data} onChange={(d) => onChange({ type: "fade_text", data: d })} />
      )}
      {cell.type === "image" && (
        <ImageBlockEditor data={cell.data} onChange={(d) => onChange({ type: "image", data: d })} />
      )}
      {cell.type === "video" && (
        <VideoBlockEditor data={cell.data} onChange={(d) => onChange({ type: "video", data: d })} />
      )}
      {cell.type === "action_button" && (
        <ActionButtonBlockEditor data={cell.data} onChange={(d) => onChange({ type: "action_button", data: d })} />
      )}
    </div>
  );
}

export default function GridBlockEditor({ data, onChange }: Props) {
  const setColumns = (columns: 2 | 3 | 4) => {
    const cells = Array.from({ length: columns }, (_, i) => data.cells[i] ?? { type: "text" as const, data: { content: "" } });
    onChange({ columns, cells });
  };

  const updateCell = (i: number, cell: CellBlock) => {
    const cells = data.cells.map((c, idx) => idx === i ? cell : c);
    onChange({ ...data, cells });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "#141413" }}>열 수</label>
        <div className="flex gap-2">
          {([2, 3, 4] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setColumns(n)}
              className="px-5 py-2 rounded-lg text-sm font-medium border transition-colors"
              style={{
                borderColor: data.columns === n ? "#cc785c" : "#e6dfd8",
                background: data.columns === n ? "#cc785c" : "transparent",
                color: data.columns === n ? "#fff" : "#6c6a64",
              }}
            >
              {n}열
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {data.cells.map((cell, i) => (
          <div key={i}>
            <p className="text-xs font-semibold mb-2" style={{ color: "#8e8b82" }}>
              {i + 1}번째 셀
            </p>
            <CellEditor cell={cell} onChange={(c) => updateCell(i, c)} />
          </div>
        ))}
      </div>
    </div>
  );
}
