"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, Trash2, ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { AdminPageHeader, AdminTable } from "@/components/admin/organisms";
import { FilterTabs, ResultCount, ToggleButton, IconActionButton } from "@/components/admin/molecules";

type Menu = {
  id: string;
  name: string;
  href: string;
  is_visible: boolean;
};

type SubMenu = {
  id: string;
  menu_id: string;
  name: string;
  href: string;
  position: "left" | "center" | "right";
  icon: string | null;
  sort_order: number;
  is_visible: boolean;
};

type Position = "left" | "center" | "right";

const POSITION_TABS = [
  { label: "중앙 메뉴", value: "center" as Position },
  { label: "좌측 메뉴", value: "left" as Position },
  { label: "우측 메뉴", value: "right" as Position },
];

const SUB_COLUMNS = [
  { label: "순서", className: "text-center" },
  { label: "메뉴명" },
  { label: "경로" },
  { label: "아이콘", className: "text-center" },
  { label: "노출", className: "text-center" },
  { label: "삭제", className: "text-center" },
];
const SUB_GRID = "80px 1fr 1fr 120px 110px 60px";

export default function AdminMenuDetailPage() {
  const params = useParams();
  const router = useRouter();
  const menuId = params.id as string;
  const supabase = createClient();

  const [menu, setMenu] = useState<Menu | null>(null);
  const [subMenus, setSubMenus] = useState<SubMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePosition, setActivePosition] = useState<Position>("center");

  // 메인 메뉴 편집
  const [editingMenu, setEditingMenu] = useState(false);
  const [menuName, setMenuName] = useState("");
  const [menuHref, setMenuHref] = useState("");
  const [savingMenu, setSavingMenu] = useState(false);

  // 서브메뉴 인라인 편집
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState("");
  const [editSubHref, setEditSubHref] = useState("");
  const [editSubIcon, setEditSubIcon] = useState("");
  const [savingSubId, setSavingSubId] = useState<string | null>(null);

  // 서브메뉴 노출 토글
  const [togglingSubId, setTogglingSubId] = useState<string | null>(null);

  // 서브메뉴 삭제
  const [deletingSubId, setDeletingSubId] = useState<string | null>(null);

  // 서브메뉴 추가 폼
  const [newSubName, setNewSubName] = useState("");
  const [newSubHref, setNewSubHref] = useState("");
  const [newSubIcon, setNewSubIcon] = useState("");
  const [addingSub, setAddingSub] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: menuData }, { data: subData }] = await Promise.all([
      supabase.from("menus").select("id, name, href, is_visible").eq("id", menuId).single(),
      supabase
        .from("sub_menus")
        .select("id, menu_id, name, href, position, icon, sort_order, is_visible")
        .eq("menu_id", menuId)
        .order("position")
        .order("sort_order"),
    ]);
    if (menuData) {
      setMenu(menuData);
      setMenuName(menuData.name);
      setMenuHref(menuData.href);
    }
    setSubMenus(subData ?? []);
    setLoading(false);
  }, [supabase, menuId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = subMenus.filter((s) => s.position === activePosition);

  // ── 메인 메뉴 저장 ────────────────────────────────────────────
  const saveMenu = async () => {
    const name = menuName.trim();
    const href = menuHref.trim();
    if (!name || !href) return;
    setSavingMenu(true);
    const { error } = await supabase.from("menus").update({ name, href }).eq("id", menuId);
    if (error) alert("저장 중 오류가 발생했습니다.");
    else {
      setMenu((prev) => (prev ? { ...prev, name, href } : prev));
      setEditingMenu(false);
    }
    setSavingMenu(false);
  };

  // ── 서브메뉴 인라인 편집 ──────────────────────────────────────
  const startSubEdit = (sub: SubMenu) => {
    setEditingSubId(sub.id);
    setEditSubName(sub.name);
    setEditSubHref(sub.href);
    setEditSubIcon(sub.icon ?? "");
  };

  const cancelSubEdit = () => setEditingSubId(null);

  const saveSubEdit = async (id: string) => {
    const name = editSubName.trim();
    const href = editSubHref.trim();
    if (!name || !href) return;
    setSavingSubId(id);
    const icon = editSubIcon.trim() || null;
    const { error } = await supabase
      .from("sub_menus")
      .update({ name, href, icon })
      .eq("id", id);
    if (error) alert("저장 중 오류가 발생했습니다.");
    else {
      setSubMenus((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name, href, icon } : s))
      );
      setEditingSubId(null);
    }
    setSavingSubId(null);
  };

  // ── 서브메뉴 순서 변경 ────────────────────────────────────────
  const moveSubOrder = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= filtered.length) return;
    const a = filtered[index];
    const b = filtered[target];
    const nextA = { ...a, sort_order: b.sort_order };
    const nextB = { ...b, sort_order: a.sort_order };
    setSubMenus((prev) =>
      prev.map((s) => (s.id === a.id ? nextA : s.id === b.id ? nextB : s))
    );
    await Promise.all([
      supabase.from("sub_menus").update({ sort_order: nextA.sort_order }).eq("id", a.id),
      supabase.from("sub_menus").update({ sort_order: nextB.sort_order }).eq("id", b.id),
    ]);
  };

  // ── 서브메뉴 노출 토글 ────────────────────────────────────────
  const toggleSubVisible = async (sub: SubMenu) => {
    setTogglingSubId(sub.id);
    const next = !sub.is_visible;
    const { error } = await supabase
      .from("sub_menus")
      .update({ is_visible: next })
      .eq("id", sub.id);
    if (error) alert("변경 중 오류가 발생했습니다.");
    else
      setSubMenus((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, is_visible: next } : s))
      );
    setTogglingSubId(null);
  };

  // ── 서브메뉴 삭제 ─────────────────────────────────────────────
  const handleSubDelete = async (sub: SubMenu) => {
    if (!confirm(`"${sub.name}" 서브메뉴를 삭제하시겠습니까?`)) return;
    setDeletingSubId(sub.id);
    const { error } = await supabase.from("sub_menus").delete().eq("id", sub.id);
    if (error) alert("삭제 중 오류가 발생했습니다.");
    else setSubMenus((prev) => prev.filter((s) => s.id !== sub.id));
    setDeletingSubId(null);
  };

  // ── 서브메뉴 추가 ─────────────────────────────────────────────
  const handleSubAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSubName.trim();
    const href = newSubHref.trim();
    if (!name || !href) return;
    setAddingSub(true);
    const posFiltered = subMenus.filter((s) => s.position === activePosition);
    const maxOrder =
      posFiltered.length > 0 ? Math.max(...posFiltered.map((s) => s.sort_order)) + 1 : 0;
    const icon = newSubIcon.trim() || null;
    const { error } = await supabase.from("sub_menus").insert({
      menu_id: menuId,
      name,
      href,
      position: activePosition,
      icon,
      sort_order: maxOrder,
      is_visible: true,
    });
    if (error) alert("추가 중 오류가 발생했습니다.");
    else {
      setNewSubName("");
      setNewSubHref("");
      setNewSubIcon("");
      fetchData();
    }
    setAddingSub(false);
  };

  if (!loading && !menu) return <div className="p-8">메뉴를 찾을 수 없습니다.</div>;

  return (
    <div className="p-8 max-w-5xl">
      {/* 뒤로가기 */}
      <button
        onClick={() => router.push("/admin/menus")}
        className="flex items-center gap-1.5 text-sm mb-6 transition-colors"
        style={{ color: "#8e8b82" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#cc785c")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#8e8b82")}
      >
        <ArrowLeft className="w-4 h-4" />
        메뉴 목록으로
      </button>

      {/* 메인 메뉴 정보 */}
      <div
        className="rounded-xl border p-6 mb-8"
        style={{ borderColor: "#e6dfd8", background: "#fff" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: "#141413" }}>
            메인 메뉴 정보
          </h2>
          {!editingMenu && (
            <button
              onClick={() => setEditingMenu(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ color: "#cc785c", background: "#fdf3ef" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background = "#fce8e0")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background = "#fdf3ef")
              }
            >
              편집
            </button>
          )}
        </div>

        {editingMenu ? (
          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: "#6c6a64" }}>
                메뉴명
              </label>
              <input
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: "#cc785c", outline: "none" }}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: "#6c6a64" }}>
                경로
              </label>
              <input
                value={menuHref}
                onChange={(e) => setMenuHref(e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm font-mono"
                style={{ borderColor: "#cc785c", outline: "none" }}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveMenu}
                disabled={savingMenu}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-40"
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
                onClick={() => {
                  setMenuName(menu?.name ?? "");
                  setMenuHref(menu?.href ?? "");
                  setEditingMenu(false);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ color: "#6c6a64", background: "#efe9de" }}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-8">
            <div>
              <span className="text-xs" style={{ color: "#8e8b82" }}>
                메뉴명
              </span>
              <p className="text-sm font-semibold mt-0.5" style={{ color: "#252523" }}>
                {menu?.name}
              </p>
            </div>
            <div>
              <span className="text-xs" style={{ color: "#8e8b82" }}>
                경로
              </span>
              <p className="text-sm font-mono mt-0.5" style={{ color: "#6c6a64" }}>
                {menu?.href}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 서브메뉴 */}
      <AdminPageHeader title="서브 메뉴 관리" description="2단 서브바의 좌측·중앙·우측 메뉴를 관리합니다." />

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <FilterTabs tabs={POSITION_TABS} active={activePosition} onChange={setActivePosition} />
        <ResultCount total={filtered.length} unit="개" />
      </div>

      <AdminTable
        columns={SUB_COLUMNS}
        gridTemplateColumns={SUB_GRID}
        loading={loading}
        isEmpty={filtered.length === 0}
        emptyMessage="등록된 서브메뉴가 없습니다."
      >
        {filtered.map((sub, index) => (
          <div
            key={sub.id}
            className="grid items-center px-5 py-3 border-b last:border-b-0 hover:bg-[#efe9de]/30 transition-colors"
            style={{ gridTemplateColumns: SUB_GRID, borderColor: "#e6dfd8" }}
          >
            {/* 순서 */}
            <div className="flex items-center justify-center gap-0.5">
              <button
                onClick={() => moveSubOrder(index, -1)}
                disabled={index === 0}
                className="p-1 rounded transition-colors disabled:opacity-20"
                style={{ color: "#8e8b82" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color = "#cc785c")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color = "#8e8b82")
                }
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => moveSubOrder(index, 1)}
                disabled={index === filtered.length - 1}
                className="p-1 rounded transition-colors disabled:opacity-20"
                style={{ color: "#8e8b82" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color = "#cc785c")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color = "#8e8b82")
                }
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* 메뉴명 */}
            <div className="pr-3">
              {editingSubId === sub.id ? (
                <input
                  value={editSubName}
                  onChange={(e) => setEditSubName(e.target.value)}
                  className="w-full px-2 py-1 rounded border text-sm"
                  style={{ borderColor: "#cc785c", outline: "none" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveSubEdit(sub.id);
                    if (e.key === "Escape") cancelSubEdit();
                  }}
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => startSubEdit(sub)}
                  className="text-sm font-medium text-left w-full truncate hover:underline"
                  style={{ color: "#252523" }}
                >
                  {sub.name}
                </button>
              )}
            </div>

            {/* 경로 */}
            <div className="pr-3">
              {editingSubId === sub.id ? (
                <input
                  value={editSubHref}
                  onChange={(e) => setEditSubHref(e.target.value)}
                  className="w-full px-2 py-1 rounded border text-sm font-mono"
                  style={{ borderColor: "#cc785c", outline: "none" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveSubEdit(sub.id);
                    if (e.key === "Escape") cancelSubEdit();
                  }}
                />
              ) : (
                <button
                  onClick={() => startSubEdit(sub)}
                  className="text-sm font-mono text-left w-full truncate hover:underline"
                  style={{ color: "#6c6a64" }}
                >
                  {sub.href}
                </button>
              )}
            </div>

            {/* 아이콘 (우측 전용으로 주로 사용, 다른 position도 입력 가능) */}
            <div className="flex justify-center pr-2">
              {editingSubId === sub.id ? (
                <div className="flex items-center gap-1.5">
                  <input
                    value={editSubIcon}
                    onChange={(e) => setEditSubIcon(e.target.value)}
                    placeholder="예: Heart"
                    className="w-full px-2 py-1 rounded border text-xs font-mono"
                    style={{ borderColor: "#cc785c", outline: "none" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveSubEdit(sub.id);
                      if (e.key === "Escape") cancelSubEdit();
                    }}
                  />
                  <button
                    onClick={() => saveSubEdit(sub.id)}
                    disabled={savingSubId === sub.id}
                    className="px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap"
                    style={{ background: "#cc785c" }}
                  >
                    저장
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startSubEdit(sub)}
                  className="text-xs font-mono px-2 py-1 rounded transition-colors"
                  style={{ color: sub.icon ? "#cc785c" : "#c0bdb6", background: sub.icon ? "#fdf3ef" : "transparent" }}
                >
                  {sub.icon ?? "—"}
                </button>
              )}
            </div>

            {/* 노출 토글 */}
            <div className="flex justify-center">
              <ToggleButton
                active={sub.is_visible}
                pending={togglingSubId === sub.id}
                activeLabel="노출"
                inactiveLabel="숨김"
                activeColor="#5db872"
                activeBg="#f0faf1"
                onClick={() => toggleSubVisible(sub)}
              />
            </div>

            {/* 삭제 */}
            <div className="flex justify-center">
              <IconActionButton
                icon={<Trash2 className="w-4 h-4" />}
                loading={deletingSubId === sub.id}
                variant="danger"
                onClick={() => handleSubDelete(sub)}
              />
            </div>
          </div>
        ))}

        {/* 새 서브메뉴 추가 행 */}
        <form
          onSubmit={handleSubAdd}
          className="grid items-center px-5 py-3 border-t"
          style={{ gridTemplateColumns: SUB_GRID, borderColor: "#e6dfd8", background: "#faf9f5" }}
        >
          <div />
          <div className="pr-2">
            <input
              value={newSubName}
              onChange={(e) => setNewSubName(e.target.value)}
              placeholder="메뉴명"
              className="w-full px-2 py-1.5 rounded border text-sm"
              style={{ borderColor: "#e6dfd8", outline: "none" }}
              onFocus={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = "#cc785c")}
              onBlur={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = "#e6dfd8")}
            />
          </div>
          <div className="pr-2">
            <input
              value={newSubHref}
              onChange={(e) => setNewSubHref(e.target.value)}
              placeholder="/경로"
              className="w-full px-2 py-1.5 rounded border text-sm font-mono"
              style={{ borderColor: "#e6dfd8", outline: "none" }}
              onFocus={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = "#cc785c")}
              onBlur={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = "#e6dfd8")}
            />
          </div>
          <div className="pr-2">
            <input
              value={newSubIcon}
              onChange={(e) => setNewSubIcon(e.target.value)}
              placeholder="Heart"
              className="w-full px-2 py-1.5 rounded border text-xs font-mono"
              style={{ borderColor: "#e6dfd8", outline: "none" }}
              onFocus={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = "#cc785c")}
              onBlur={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = "#e6dfd8")}
            />
          </div>
          <div className="flex justify-center col-span-2">
            <button
              type="submit"
              disabled={addingSub || !newSubName.trim() || !newSubHref.trim()}
              className="px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-40"
              style={{ background: "#cc785c" }}
              onMouseEnter={(e) => {
                if (!addingSub) (e.currentTarget as HTMLButtonElement).style.background = "#a9583e";
              }}
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background = "#cc785c")
              }
            >
              + 추가
            </button>
          </div>
        </form>
      </AdminTable>
    </div>
  );
}
