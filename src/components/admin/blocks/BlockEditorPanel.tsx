"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Spinner } from "@/components/admin/atoms";
import type { PageBlock, BlockType, BlockData, GridBlockData } from "@/types/blocks";
import { BLOCK_TYPE_LABELS } from "@/types/blocks";
import TextBlockEditor from "./editors/TextBlockEditor";
import FadeTextBlockEditor from "./editors/FadeTextBlockEditor";
import ImageBlockEditor from "./editors/ImageBlockEditor";
import VideoBlockEditor from "./editors/VideoBlockEditor";
import ActionButtonBlockEditor from "./editors/ActionButtonBlockEditor";
import GridBlockEditor from "./editors/GridBlockEditor";

interface Props {
  block: Partial<PageBlock> | null; // null이면 닫힘
  onClose: () => void;
  onSave: (type: BlockType, data: BlockData) => Promise<void>;
}

const DEFAULT_DATA: Record<BlockType, BlockData> = {
  text: { content: "" },
  image: { src: "", alt: "" },
  fade_text: { content: "", delay: 0 },
  video: { url: "", type: "youtube" },
  action_button: { buttons: [], align: "center" },
  grid: { columns: 2, cells: [{ type: "text", data: { content: "" } }, { type: "text", data: { content: "" } }] },
};

export default function BlockEditorPanel({ block, onClose, onSave }: Props) {
  const isOpen = block !== null;
  const isNew = block && !block.id;

  const [type, setType] = useState<BlockType>("text");
  const [data, setData] = useState<BlockData>({ content: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!block) return;
    const t = (block.type ?? "text") as BlockType;
    setType(t);
    setData(block.data ?? DEFAULT_DATA[t]);
  }, [block]);

  const handleTypeChange = (t: BlockType) => {
    setType(t);
    setData(DEFAULT_DATA[t]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(type, data);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 z-40 bg-black/40 transition-opacity"
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none" }}
        onClick={onClose}
      />

      {/* 패널 */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col shadow-2xl"
        style={{
          width: "min(560px, 100vw)",
          background: "#faf9f5",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#e6dfd8" }}>
          <h2 className="text-base font-semibold" style={{ color: "#141413" }}>
            {isNew ? "블록 추가" : "블록 편집"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "#8e8b82" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#efe9de"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 바디 */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* 블록 타입 선택 (신규 추가 시에만) */}
          {isNew && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" style={{ color: "#141413" }}>블록 유형</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(BLOCK_TYPE_LABELS) as BlockType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className="py-2.5 rounded-xl text-sm font-medium border transition-colors"
                    style={{
                      borderColor: type === t ? "#cc785c" : "#e6dfd8",
                      background: type === t ? "#cc785c" : "#fff",
                      color: type === t ? "#fff" : "#6c6a64",
                    }}
                  >
                    {BLOCK_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 블록 에디터 */}
          <div>
            {type === "text" && (
              <TextBlockEditor
                data={data as Parameters<typeof TextBlockEditor>[0]["data"]}
                onChange={setData}
              />
            )}
            {type === "fade_text" && (
              <FadeTextBlockEditor
                data={data as Parameters<typeof FadeTextBlockEditor>[0]["data"]}
                onChange={setData}
              />
            )}
            {type === "image" && (
              <ImageBlockEditor
                data={data as Parameters<typeof ImageBlockEditor>[0]["data"]}
                onChange={setData}
              />
            )}
            {type === "video" && (
              <VideoBlockEditor
                data={data as Parameters<typeof VideoBlockEditor>[0]["data"]}
                onChange={setData}
              />
            )}
            {type === "action_button" && (
              <ActionButtonBlockEditor
                data={data as Parameters<typeof ActionButtonBlockEditor>[0]["data"]}
                onChange={setData}
              />
            )}
            {type === "grid" && (
              <GridBlockEditor
                data={data as GridBlockData}
                onChange={setData}
              />
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: "#e6dfd8" }}>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{ borderColor: "#e6dfd8", color: "#6c6a64" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#efe9de")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: "#cc785c" }}
            onMouseEnter={(e) => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = "#a9583e"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#cc785c"; }}
          >
            {saving && <Spinner size="sm" color="#fff" />}
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </>
  );
}
