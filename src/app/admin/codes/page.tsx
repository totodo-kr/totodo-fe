"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useAdminCodes, CODE_GROUPS, Code } from "@/hooks/useAdminCodes";

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

  const startEdit = (code: Code) => {
    setEditing({ id: code.id, label: code.label, sort_order: code.sort_order });
  };

  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.label.trim()) return;
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
      setAddError(res.message?.includes("unique") ? "이미 존재하는 코드입니다." : (res.message ?? "추가 실패"));
    } else {
      setAddForm(DEFAULT_ADD);
    }
  };

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#141413" }}>
          코드 관리
        </h1>
        <p className="text-sm mt-1" style={{ color: "#6c6a64" }}>
          상품 배송 타입, 출판 형태 등 공통 코드를 관리합니다.
        </p>
      </div>

      {/* Group tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {CODE_GROUPS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => {
              setGroup(value);
              setEditing(null);
              setAddForm(DEFAULT_ADD);
              setAddError("");
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={
              group === value
                ? { background: "#cc785c", color: "#fff" }
                : { background: "#efe9de", color: "#6c6a64" }
            }
            onMouseEnter={(e) => {
              if (group !== value)
                (e.currentTarget as HTMLButtonElement).style.background = "#e6dfd8";
            }}
            onMouseLeave={(e) => {
              if (group !== value)
                (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
            }}
          >
            <span className="text-xs opacity-70 mr-1">{value}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden mb-4" style={{ borderColor: "#e6dfd8" }}>
        {/* Header */}
        <div
          className="grid items-center px-4 py-3 text-xs font-semibold uppercase tracking-wide border-b"
          style={{
            gridTemplateColumns: "120px 1fr 60px 70px 72px",
            background: "#efe9de",
            color: "#6c6a64",
            borderColor: "#e6dfd8",
          }}
        >
          <span>코드값</span>
          <span>레이블</span>
          <span className="text-center">순서</span>
          <span className="text-center">활성</span>
          <span className="text-center">관리</span>
        </div>

        <div style={{ background: "#faf9f5" }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div
                className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "#cc785c", borderTopColor: "transparent" }}
              />
            </div>
          ) : codes.length === 0 ? (
            <p className="text-center py-10 text-sm" style={{ color: "#8e8b82" }}>
              코드가 없습니다.
            </p>
          ) : (
            codes.map((code) => {
              const isEditing = editing?.id === code.id;
              const isPending = pendingId === code.id;

              return (
                <div
                  key={code.id}
                  className="grid items-center px-4 py-3 border-b last:border-b-0 transition-colors"
                  style={{
                    gridTemplateColumns: "120px 1fr 60px 70px 72px",
                    borderColor: "#e6dfd8",
                    background: isEditing ? "#efe9de30" : undefined,
                    opacity: !code.is_active ? 0.5 : 1,
                  }}
                >
                  {/* Code value (readonly) */}
                  <div>
                    <code
                      className="text-xs font-mono px-2 py-0.5 rounded"
                      style={{ background: "#efe9de", color: "#cc785c" }}
                    >
                      {code.code}
                    </code>
                  </div>

                  {/* Label (editable) */}
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
                        style={{
                          background: "#faf9f5",
                          borderColor: "#cc785c",
                          color: "#141413",
                        }}
                      />
                    ) : (
                      <span className="text-sm" style={{ color: "#252523" }}>
                        {code.label}
                      </span>
                    )}
                  </div>

                  {/* Sort order (editable) */}
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
                        style={{
                          background: "#faf9f5",
                          borderColor: "#cc785c",
                          color: "#141413",
                        }}
                      />
                    ) : (
                      <span className="text-sm" style={{ color: "#6c6a64" }}>
                        {code.sort_order}
                      </span>
                    )}
                  </div>

                  {/* Active toggle */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => toggleActive(code.id, code.is_active)}
                      disabled={isPending}
                      className="text-xs font-medium px-2.5 py-1 rounded-full border transition-all disabled:opacity-40"
                      style={
                        code.is_active
                          ? { background: "#e8f4e8", color: "#2d7d32", borderColor: "#c8e6c9" }
                          : { background: "#efe9de", color: "#8e8b82", borderColor: "#e6dfd8" }
                      }
                    >
                      {isPending ? (
                        <div
                          className="w-3 h-3 border border-t-transparent rounded-full animate-spin mx-1"
                          style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
                        />
                      ) : code.is_active ? (
                        "활성"
                      ) : (
                        "비활성"
                      )}
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-1">
                    {isEditing ? (
                      <>
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
                        <button
                          onClick={() => startEdit(code)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: "#8e8b82" }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color = "#cc785c";
                            (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color = "#8e8b82";
                            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(code)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: "#8e8b82" }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color = "#c64545";
                            (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color = "#8e8b82";
                            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add new code */}
      <div
        className="rounded-xl border p-5"
        style={{ borderColor: "#e6dfd8", background: "#faf9f5" }}
      >
        <p className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "#141413" }}>
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
              className="w-full h-9 px-3 rounded-lg text-sm border outline-none font-mono"
              style={{ background: "#efe9de", borderColor: "#e6dfd8", color: "#141413" }}
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
              className="w-full h-9 px-3 rounded-lg text-sm border outline-none"
              style={{ background: "#efe9de", borderColor: "#e6dfd8", color: "#141413" }}
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
              className="w-full h-9 px-3 rounded-lg text-sm border outline-none text-center"
              style={{ background: "#efe9de", borderColor: "#e6dfd8", color: "#141413" }}
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
              {adding ? (
                <div
                  className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: "#fff", borderTopColor: "transparent" }}
                />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
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
