"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Spinner } from "@/components/admin/atoms";
import { ToggleButton, IconActionButton } from "@/components/admin/molecules";
import BlockEditorPanel from "@/components/admin/blocks/BlockEditorPanel";
import BlockRenderer from "@/components/blocks/BlockRenderer";
import { BLOCK_TYPE_LABELS } from "@/types/blocks";
import type { PageBlock, BlockType, BlockData, ImageBlockData, GridBlockData } from "@/types/blocks";
import { ChevronUp, ChevronDown, Pencil, Plus, Trash2, Monitor } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/organisms";

export default function AdminHomePage() {
  const supabase = useMemo(() => createClient(), []);
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editorBlock, setEditorBlock] = useState<Partial<PageBlock> | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [previewColWidth, setPreviewColWidth] = useState(0);
  const previewColRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = previewColRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setPreviewColWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fetchBlocks = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("page_blocks")
      .select("*")
      .eq("page_key", "home")
      .order("order_index", { ascending: true });
    setBlocks((data ?? []) as PageBlock[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchBlocks(); }, [fetchBlocks]);

  // ─── 순서 변경 ───────────────────────────────────────
  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const updated = [...blocks];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    const patchA = { id: updated[index].id, order_index: index };
    const patchB = { id: updated[target].id, order_index: target };
    setBlocks(updated.map((b, i) => ({ ...b, order_index: i })));
    await Promise.all([
      supabase.from("page_blocks").update({ order_index: patchA.order_index }).eq("id", patchA.id),
      supabase.from("page_blocks").update({ order_index: patchB.order_index }).eq("id", patchB.id),
    ]);
  };

  // ─── 공개/숨김 토글 ───────────────────────────────────
  const toggle = async (block: PageBlock) => {
    setTogglingId(block.id);
    const { error } = await supabase
      .from("page_blocks")
      .update({ is_visible: !block.is_visible })
      .eq("id", block.id);
    if (!error) {
      setBlocks((prev) => prev.map((b) => b.id === block.id ? { ...b, is_visible: !b.is_visible } : b));
    }
    setTogglingId(null);
  };

  // ─── 삭제 ─────────────────────────────────────────────
  const handleDelete = async (block: PageBlock) => {
    if (!confirm("이 블록을 삭제하시겠습니까?")) return;
    setDeletingId(block.id);
    if (block.type === "image") {
      const d = block.data as ImageBlockData;
      if (d.storagePath) await supabase.storage.from("totodo_pub_storage").remove([d.storagePath]);
    }
    if (block.type === "grid") {
      const d = block.data as GridBlockData;
      const paths = d.cells
        .filter((c) => c.type === "image" && (c.data as ImageBlockData).storagePath)
        .map((c) => (c.data as ImageBlockData).storagePath!);
      if (paths.length > 0) await supabase.storage.from("totodo_pub_storage").remove(paths);
    }
    const { error } = await supabase.from("page_blocks").delete().eq("id", block.id);
    if (error) alert("삭제 중 오류가 발생했습니다.");
    else setBlocks((prev) => prev.filter((b) => b.id !== block.id));
    setDeletingId(null);
  };

  // ─── 저장 ─────────────────────────────────────────────
  const handleSave = async (type: BlockType, data: BlockData) => {
    if (editorBlock?.id) {
      const { error } = await supabase.from("page_blocks").update({ type, data }).eq("id", editorBlock.id);
      if (error) { alert("저장 중 오류가 발생했습니다."); return; }
    } else {
      const { error } = await supabase.from("page_blocks").insert({
        page_key: "home", type, order_index: blocks.length, data, is_visible: true,
      });
      if (error) { alert("저장 중 오류가 발생했습니다."); return; }
    }
    await fetchBlocks();
  };

  return (
    <div className="p-8 max-w-6xl">
      <AdminPageHeader
        title="메인 페이지 편집"
        description="메인 페이지에 표시될 블록을 관리합니다."
        action={{ label: "블록 추가", onClick: () => setEditorBlock({}) }}
      />

      {/* ── 본문: 2열 ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── 좌: 미리보기 ── */}
        <div
          ref={previewColRef}
          className="flex flex-col border-r flex-1 min-w-0"
          style={{ borderColor: "#e6dfd8" }}
        >
          {/* 미리보기 헤더 */}
          <div
            className="flex items-center gap-2 px-4 py-2.5 border-b flex-shrink-0"
            style={{ borderColor: "rgba(255,255,255,0.08)", background: "#111" }}
          >
            <Monitor className="w-3.5 h-3.5" style={{ color: "#6c6a64" }} />
            <span className="text-xs font-medium" style={{ color: "#6c6a64" }}>미리보기</span>
            <span className="text-xs ml-auto" style={{ color: "#3d3b37" }}>클릭 시 편집</span>
          </div>

          {/* 미리보기 본문 */}
          <div className="flex-1 bg-black text-white px-2" style={{ overflowY: "auto", overflowX: "hidden" }}>
            {loading ? (
              <div className="flex justify-center py-12"><Spinner size="sm" color="white" /></div>
            ) : blocks.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-xs" style={{ color: "#3d3b37" }}>
                블록을 추가하면 여기에 표시됩니다.
              </div>
            ) : (
              <div style={{ zoom: previewColWidth / 1200, width: "1200px", visibility: previewColWidth ? "visible" : "hidden" }}>
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    onClick={() => setEditorBlock(block)}
                    onMouseEnter={() => setHoveredId(block.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="cursor-pointer transition-all"
                    style={{
                      opacity: block.is_visible ? 1 : 0.3,
                      outline: hoveredId === block.id ? "3px solid #cc785c" : "3px solid transparent",
                      outlineOffset: "-3px",
                    }}
                  >
                    <div className="py-6">
                      <BlockRenderer block={block} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 우: 블록 목록 ── */}
        <div className="flex-1 min-w-0 overflow-y-auto px-6 py-5" style={{ borderLeft: "1px solid #e6dfd8" }}>
          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="md" /></div>
          ) : blocks.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-4 py-20 rounded-2xl border-2 border-dashed"
              style={{ borderColor: "#e6dfd8", color: "#8e8b82" }}
            >
              <p className="text-sm">아직 블록이 없습니다.</p>
              <button
                type="button"
                onClick={() => setEditorBlock({})}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
                style={{ background: "#cc785c" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#a9583e")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#cc785c")}
              >
                <Plus className="w-4 h-4" />
                첫 블록 추가하기
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {blocks.map((block, i) => (
                <div
                  key={block.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all"
                  style={{
                    borderColor: hoveredId === block.id ? "#cc785c" : "#e6dfd8",
                    background: block.is_visible ? "#fff" : "#faf9f5",
                    opacity: block.is_visible ? 1 : 0.6,
                  }}
                  onMouseEnter={() => setHoveredId(block.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* 순서 변경 */}
                  <div className="flex flex-col gap-0.5">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                      className="p-1 rounded transition-colors disabled:opacity-20"
                      style={{ color: "#8e8b82" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#141413"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#8e8b82"; }}>
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === blocks.length - 1}
                      className="p-1 rounded transition-colors disabled:opacity-20"
                      style={{ color: "#8e8b82" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#141413"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#8e8b82"; }}>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 블록 정보 */}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
                      style={{ background: "#efe9de", color: "#6c6a64" }}>
                      {BLOCK_TYPE_LABELS[block.type]}
                    </span>
                    <span className="text-sm truncate" style={{ color: "#252523" }}>
                      {getBlockPreview(block)}
                    </span>
                  </div>

                  {/* 공개/숨김 */}
                  <ToggleButton
                    active={block.is_visible}
                    pending={togglingId === block.id}
                    activeLabel="공개"
                    inactiveLabel="숨김"
                    activeColor="#5db872"
                    onClick={() => toggle(block)}
                  />

                  {/* 편집 */}
                  <button type="button" onClick={() => setEditorBlock(block)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: "#8e8b82" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#cc785c"; (e.currentTarget as HTMLButtonElement).style.background = "#efe9de"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#8e8b82"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
                    <Pencil className="w-4 h-4" />
                  </button>

                  {/* 삭제 */}
                  <IconActionButton
                    icon={<Trash2 className="w-4 h-4" />}
                    loading={deletingId === block.id}
                    variant="danger"
                    onClick={() => handleDelete(block)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BlockEditorPanel
        block={editorBlock}
        onClose={() => setEditorBlock(null)}
        onSave={handleSave}
      />
    </div>
  );
}

function getBlockPreview(block: PageBlock): string {
  switch (block.type) {
    case "text":
    case "fade_text": {
      const d = block.data as { content: string };
      return d.content.replace(/<[^>]+>/g, "").trim().slice(0, 50) || "(내용 없음)";
    }
    case "image": {
      const d = block.data as { alt: string; src: string };
      return d.alt || d.src || "(이미지)";
    }
    case "video": {
      const d = block.data as { url: string };
      return d.url || "(URL 없음)";
    }
    case "action_button": {
      const d = block.data as { buttons: { label: string }[] };
      return d.buttons.map((b) => b.label).join(", ") || "(버튼 없음)";
    }
    case "grid": {
      const d = block.data as { columns: number };
      return `${d.columns}열 그리드`;
    }
    default:
      return "";
  }
}
