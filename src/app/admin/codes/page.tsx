"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useAdminCodes, CODE_GROUPS, Code } from "@/hooks/useAdminCodes";
import { AdminPageHeader, AdminTable } from "@/components/admin/organisms";
import { IconActionButton, ToggleButton, SearchSelect } from "@/components/admin/molecules";
import { Spinner } from "@/components/admin/atoms";
import type { SearchSelectOption } from "@/components/admin/molecules";

interface EditState {
  id: number;
  label: string;
  sort_order: number;
}

interface AddState {
  code: string;
  label: string;
  sort_order: string;
}

const DEFAULT_ADD: AddState = { code: "", label: "", sort_order: "" };

const GROUP_OPTIONS: SearchSelectOption[] = CODE_GROUPS.map(({ value, label }) => ({
  value,
  label,
  prefix: value,
}));

const COLUMNS = [
  { label: "코드값" },
  { label: "레이블" },
  { label: "순서", className: "text-center" },
  { label: "활성", className: "text-center" },
  { label: "관리", className: "text-center" },
];

const GRID = "180px 1fr 60px 90px 80px";

const inputBase =
  "w-full h-9 px-3 rounded-lg text-sm border outline-none transition-all";

const inputStyle = {
  background: "#efe9de",
  borderColor: "#e6dfd8",
  color: "#141413",
} as const;

const editInputStyle = {
  background: "#faf9f5",
  borderColor: "#cc785c",
  color: "#141413",
} as const;

export default function AdminCodesPage() {
  const { codes, loading, pendingId, fetchCodes, addCode, updateCode, toggleActive, deleteCode } =
    useAdminCodes();

  const [group, setGroup] = useState<string>(CODE_GROUPS[0].value);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [addForm, setAddForm] = useState<AddState>(DEFAULT_ADD);
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchCodes(group);
  }, [group, fetchCodes]);

  const handleGroupChange = (value: string) => {
    setGroup(value);
    setEditing(null);
    setAddForm(DEFAULT_ADD);
    setAddError("");
  };

  const startEdit = (code: Code) => {
    setEditing({ id: code.id, label: code.label, sort_order: code.sort_order });
  };

  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing || !editing.label.trim()) return;
    await updateCode(editing.id, {
      label: editing.label.trim(),
      sort_order: editing.sort_order,
    });
    setEditing(null);
  };

  const handleDelete = async (code: Code) => {
    if (!confirm(`"${code.label}" 코드를 삭제하시겠습니까?`)) return;
    await deleteCode(code.id);
  };

  const handleAdd = async () => {
    setAddError("");
    if (!addForm.code.trim()) return setAddError("코드값을 입력하세요.");
    if (!addForm.label.trim()) return setAddError("레이블을 입력하세요.");

    setAdding(true);
    const res = await addCode({
      group_code: group,
      code: addForm.code.trim(),
      label: addForm.label.trim(),
      sort_order: parseInt(addForm.sort_order) || 0,
    });
    setAdding(false);

    if (!res.ok) {
      setAddError(
        res.message?.includes("unique")
          ? "이미 존재하는 코드입니다."
          : (res.message ?? "추가 실패")
      );
    } else {
      setAddForm(DEFAULT_ADD);
    }
  };

  return (
    <div className="p-8 max-w-6xl">
      <AdminPageHeader
        title="코드 관리"
        description="상품 배송 타입, 출판 형태 등 공통 코드를 관리합니다."
      />

      {/* 그룹 선택 — SearchSelect로 자동완성 지원 */}
      <div className="mb-6">
        <p className="text-xs font-medium mb-2" style={{ color: "#6c6a64" }}>
          코드 그룹
        </p>
        <SearchSelect
          options={GROUP_OPTIONS}
          value={group}
          onChange={handleGroupChange}
          placeholder="그룹 선택"
        />
      </div>

      <AdminTable
        columns={COLUMNS}
        gridTemplateColumns={GRID}
        loading={loading}
        isEmpty={codes.length === 0}
        emptyMessage="코드가 없습니다."
        px="px-4"
      >
        {codes.map((code) => {
          const isEditing = editing?.id === code.id;
          const isPending = pendingId === code.id;

          return (
            <div
              key={code.id}
              className="grid items-center px-4 py-3 border-b last:border-b-0 hover:bg-[#efe9de]/30 transition-colors"
              style={{
                gridTemplateColumns: GRID,
                borderColor: "#e6dfd8",
                background: isEditing ? "#efe9de30" : undefined,
                opacity: !code.is_active ? 0.5 : 1,
              }}
            >
              {/* 코드값 (읽기 전용) */}
              <div>
                <code
                  className="text-xs font-mono px-2 py-0.5 rounded"
                  style={{ background: "#efe9de", color: "#cc785c" }}
                >
                  {code.code}
                </code>
              </div>

              {/* 레이블 (편집 가능) */}
              <div className="px-2">
                {isEditing ? (
                  <input
                    autoFocus
                    value={editing.label}
                    onChange={(e) =>
                      setEditing((prev) => prev && { ...prev, label: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="w-full h-8 px-2 rounded-lg text-sm border outline-none"
                    style={editInputStyle}
                  />
                ) : (
                  <span className="text-sm" style={{ color: "#252523" }}>
                    {code.label}
                  </span>
                )}
              </div>

              {/* 순서 (편집 가능) */}
              <div className="flex justify-center">
                {isEditing ? (
                  <input
                    type="number"
                    value={editing.sort_order}
                    onChange={(e) =>
                      setEditing(
                        (prev) => prev && { ...prev, sort_order: parseInt(e.target.value) || 0 }
                      )
                    }
                    className="w-12 h-8 px-2 rounded-lg text-sm border outline-none text-center"
                    style={editInputStyle}
                  />
                ) : (
                  <span className="text-sm" style={{ color: "#6c6a64" }}>
                    {code.sort_order}
                  </span>
                )}
              </div>

              {/* 활성 토글 */}
              <div className="flex justify-center">
                <ToggleButton
                  active={code.is_active}
                  pending={isPending}
                  activeColor="#2d7d32"
                  activeBg="#e8f4e8"
                  inactiveBg="#efe9de"
                  pill
                  activeLabel="활성"
                  inactiveLabel="비활성"
                  onClick={() => toggleActive(code.id, code.is_active)}
                  className="px-2.5 py-1"
                />
              </div>

              {/* 액션 */}
              <div className="flex items-center justify-center gap-1">
                {isEditing ? (
                  <>
                    {/* 저장 — 초록 호버, IconActionButton과 다른 색상이라 inline */}
                    <button
                      onClick={saveEdit}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: "#2d7d32" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "#e8f4e8";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                      }}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    {/* 취소 */}
                    <button
                      onClick={cancelEdit}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: "#8e8b82" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <IconActionButton
                      icon={<Pencil className="w-3.5 h-3.5" />}
                      onClick={() => startEdit(code)}
                    />
                    <IconActionButton
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                      variant="danger"
                      onClick={() => handleDelete(code)}
                    />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </AdminTable>

      {/* 새 코드 추가 폼 */}
      <div
        className="rounded-xl border p-5 mt-4"
        style={{ borderColor: "#e6dfd8", background: "#faf9f5" }}
      >
        <p
          className="text-sm font-semibold mb-4 flex items-center gap-2"
          style={{ color: "#141413" }}
        >
          <Plus className="w-4 h-4" style={{ color: "#cc785c" }} />
          새 코드 추가
        </p>
        <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1.5fr 80px auto" }}>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#6c6a64" }}>
              코드값 *
            </label>
            <input
              type="text"
              value={addForm.code}
              onChange={(e) => setAddForm((p) => ({ ...p, code: e.target.value }))}
              placeholder="snake_case"
              className={`${inputBase} font-mono`}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#6c6a64" }}>
              레이블 *
            </label>
            <input
              type="text"
              value={addForm.label}
              onChange={(e) => setAddForm((p) => ({ ...p, label: e.target.value }))}
              placeholder="표시 이름"
              className={inputBase}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#6c6a64" }}>
              순서
            </label>
            <input
              type="number"
              value={addForm.sort_order}
              onChange={(e) => setAddForm((p) => ({ ...p, sort_order: e.target.value }))}
              placeholder="0"
              className={`${inputBase} text-center`}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAdd}
              disabled={adding}
              className="h-9 px-4 rounded-lg text-sm font-medium transition-all disabled:opacity-40 flex items-center gap-1.5"
              style={{ background: "#cc785c", color: "#fff" }}
              onMouseEnter={(e) => {
                if (!adding)
                  (e.currentTarget as HTMLButtonElement).style.background = "#a9583e";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#cc785c";
              }}
            >
              {adding ? <Spinner size="sm" color="#fff" /> : <Plus className="w-3.5 h-3.5" />}
              추가
            </button>
          </div>
        </div>
        {addError && (
          <p className="text-xs mt-2" style={{ color: "#c64545" }}>
            {addError}
          </p>
        )}
      </div>
    </div>
  );
}
