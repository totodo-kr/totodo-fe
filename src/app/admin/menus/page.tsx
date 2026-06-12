"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronUp, ChevronDown, Trash2, Layers } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { AdminPageHeader, AdminTable } from "@/components/admin/organisms";
import { ResultCount, ToggleButton, IconActionButton } from "@/components/admin/molecules";

type Menu = {
  id: string;
  name: string;
  href: string;
  sort_order: number;
  is_visible: boolean;
};

const COLUMNS = [
  { label: "순서", className: "text-center" },
  { label: "메뉴명" },
  { label: "경로" },
  { label: "노출", className: "text-center" },
  { label: "서브메뉴", className: "text-center" },
  { label: "삭제", className: "text-center" },
];
const GRID = "80px 1fr 1fr 110px 90px 60px";

export default function AdminMenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);

  // 인라인 편집 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editHref, setEditHref] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  // 노출 토글 pending
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // 삭제 pending
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 새 메뉴 추가 폼
  const [newName, setNewName] = useState("");
  const [newHref, setNewHref] = useState("");
  const [adding, setAdding] = useState(false);

  const supabase = createClient();

  const fetchMenus = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("menus")
      .select("id, name, href, sort_order, is_visible")
      .order("sort_order");
    setMenus(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  // ── 인라인 편집 ──────────────────────────────────────────────
  const startEdit = (menu: Menu) => {
    setEditingId(menu.id);
    setEditName(menu.name);
    setEditHref(menu.href);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    const name = editName.trim();
    const href = editHref.trim();
    if (!name || !href) return;
    setSavingId(id);
    const { error } = await supabase
      .from("menus")
      .update({ name, href })
      .eq("id", id);
    if (error) alert("저장 중 오류가 발생했습니다.");
    else {
      setMenus((prev) => prev.map((m) => (m.id === id ? { ...m, name, href } : m)));
      setEditingId(null);
    }
    setSavingId(null);
  };

  // ── 순서 변경 ─────────────────────────────────────────────────
  const moveOrder = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= menus.length) return;
    const next = [...menus];
    const a = next[index];
    const b = next[target];
    [a.sort_order, b.sort_order] = [b.sort_order, a.sort_order];
    [next[index], next[target]] = [b, a];
    setMenus(next);
    await Promise.all([
      supabase.from("menus").update({ sort_order: a.sort_order }).eq("id", a.id),
      supabase.from("menus").update({ sort_order: b.sort_order }).eq("id", b.id),
    ]);
  };

  // ── 노출 토글 ─────────────────────────────────────────────────
  const toggleVisible = async (menu: Menu) => {
    setTogglingId(menu.id);
    const next = !menu.is_visible;
    const { error } = await supabase
      .from("menus")
      .update({ is_visible: next })
      .eq("id", menu.id);
    if (error) alert("변경 중 오류가 발생했습니다.");
    else setMenus((prev) => prev.map((m) => (m.id === menu.id ? { ...m, is_visible: next } : m)));
    setTogglingId(null);
  };

  // ── 삭제 ──────────────────────────────────────────────────────
  const handleDelete = async (menu: Menu) => {
    if (!confirm(`"${menu.name}" 메뉴를 삭제하시겠습니까?\n하위 서브메뉴도 함께 삭제됩니다.`)) return;
    setDeletingId(menu.id);
    const { error } = await supabase.from("menus").delete().eq("id", menu.id);
    if (error) alert("삭제 중 오류가 발생했습니다.");
    else setMenus((prev) => prev.filter((m) => m.id !== menu.id));
    setDeletingId(null);
  };

  // ── 새 메뉴 추가 ──────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    const href = newHref.trim();
    if (!name || !href) return;
    setAdding(true);
    const maxOrder = menus.length > 0 ? Math.max(...menus.map((m) => m.sort_order)) + 1 : 0;
    const { error } = await supabase
      .from("menus")
      .insert({ name, href, sort_order: maxOrder, is_visible: true });
    if (error) alert("추가 중 오류가 발생했습니다.");
    else {
      setNewName("");
      setNewHref("");
      fetchMenus();
    }
    setAdding(false);
  };

  return (
    <div className="p-8 max-w-6xl">
      <AdminPageHeader
        title="메뉴 관리"
        description="사이트 상단 네비게이션 메뉴의 이름, 경로, 노출 여부를 관리합니다."
      />

      <div className="flex items-center justify-end mb-4">
        <ResultCount total={menus.length} unit="개" />
      </div>

      <AdminTable
        columns={COLUMNS}
        gridTemplateColumns={GRID}
        loading={loading}
        isEmpty={menus.length === 0}
        emptyMessage="등록된 메뉴가 없습니다."
      >
        {menus.map((menu, index) => (
          <div
            key={menu.id}
            className="grid items-center px-5 py-3 border-b last:border-b-0 hover:bg-[#efe9de]/30 transition-colors"
            style={{ gridTemplateColumns: GRID, borderColor: "#e6dfd8" }}
          >
            {/* 순서 */}
            <div className="flex items-center justify-center gap-0.5">
              <button
                onClick={() => moveOrder(index, -1)}
                disabled={index === 0}
                className="p-1 rounded transition-colors disabled:opacity-20"
                style={{ color: "#8e8b82" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#cc785c")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#8e8b82")}
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => moveOrder(index, 1)}
                disabled={index === menus.length - 1}
                className="p-1 rounded transition-colors disabled:opacity-20"
                style={{ color: "#8e8b82" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#cc785c")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#8e8b82")}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* 메뉴명 */}
            <div className="pr-4">
              {editingId === menu.id ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-2 py-1 rounded border text-sm"
                  style={{ borderColor: "#cc785c", outline: "none" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(menu.id);
                    if (e.key === "Escape") cancelEdit();
                  }}
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => startEdit(menu)}
                  className="text-sm font-medium text-left w-full truncate hover:underline"
                  style={{ color: "#252523" }}
                >
                  {menu.name}
                </button>
              )}
            </div>

            {/* 경로 */}
            <div className="pr-4">
              {editingId === menu.id ? (
                <div className="flex items-center gap-2">
                  <input
                    value={editHref}
                    onChange={(e) => setEditHref(e.target.value)}
                    className="flex-1 px-2 py-1 rounded border text-sm font-mono"
                    style={{ borderColor: "#cc785c", outline: "none" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(menu.id);
                      if (e.key === "Escape") cancelEdit();
                    }}
                  />
                  <button
                    onClick={() => saveEdit(menu.id)}
                    disabled={savingId === menu.id}
                    className="px-2 py-1 rounded text-xs font-medium text-white transition-colors"
                    style={{ background: "#cc785c" }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.background = "#a9583e")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.background = "#cc785c")
                    }
                  >
                    저장
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-2 py-1 rounded text-xs font-medium transition-colors"
                    style={{ color: "#8e8b82", background: "#efe9de" }}
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEdit(menu)}
                  className="text-sm font-mono text-left w-full truncate hover:underline"
                  style={{ color: "#6c6a64" }}
                >
                  {menu.href}
                </button>
              )}
            </div>

            {/* 노출 토글 */}
            <div className="flex justify-center">
              <ToggleButton
                active={menu.is_visible}
                pending={togglingId === menu.id}
                activeLabel="노출"
                inactiveLabel="숨김"
                activeColor="#5db872"
                activeBg="#f0faf1"
                onClick={() => toggleVisible(menu)}
              />
            </div>

            {/* 서브메뉴 링크 */}
            <div className="flex justify-center">
              <Link
                href={`/admin/menus/${menu.id}`}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ color: "#cc785c", background: "#fdf3ef" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.background = "#fce8e0")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.background = "#fdf3ef")
                }
              >
                <Layers className="w-3.5 h-3.5" />
                관리
              </Link>
            </div>

            {/* 삭제 */}
            <div className="flex justify-center">
              <IconActionButton
                icon={<Trash2 className="w-4 h-4" />}
                loading={deletingId === menu.id}
                variant="danger"
                onClick={() => handleDelete(menu)}
              />
            </div>
          </div>
        ))}

        {/* 새 메뉴 추가 행 */}
        <form
          onSubmit={handleAdd}
          className="grid items-center px-5 py-3 border-t"
          style={{ gridTemplateColumns: GRID, borderColor: "#e6dfd8", background: "#faf9f5" }}
        >
          <div />
          <div className="pr-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="메뉴명"
              className="w-full px-2 py-1.5 rounded border text-sm"
              style={{ borderColor: "#e6dfd8", outline: "none" }}
              onFocus={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = "#cc785c")}
              onBlur={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = "#e6dfd8")}
            />
          </div>
          <div className="pr-2">
            <input
              value={newHref}
              onChange={(e) => setNewHref(e.target.value)}
              placeholder="/경로"
              className="w-full px-2 py-1.5 rounded border text-sm font-mono"
              style={{ borderColor: "#e6dfd8", outline: "none" }}
              onFocus={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = "#cc785c")}
              onBlur={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = "#e6dfd8")}
            />
          </div>
          <div className="flex justify-center col-span-3">
            <button
              type="submit"
              disabled={adding || !newName.trim() || !newHref.trim()}
              className="px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-40"
              style={{ background: "#cc785c" }}
              onMouseEnter={(e) => {
                if (!adding) (e.currentTarget as HTMLButtonElement).style.background = "#a9583e";
              }}
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background = "#cc785c")
              }
            >
              + 메뉴 추가
            </button>
          </div>
        </form>
      </AdminTable>
    </div>
  );
}
