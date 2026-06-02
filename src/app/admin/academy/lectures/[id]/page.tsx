"use client";

import { useState, use } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Eye,
  Video,
  ExternalLink,
} from "lucide-react";
import { useAdminLectureDetail, AdminChapter, AdminSession } from "@/hooks/useAdminLectureDetail";

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ─── Inline edit input ────────────────────────────────────────────────────────

function InlineEdit({
  value,
  onSave,
  onCancel,
  placeholder,
}: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
  placeholder?: string;
}) {
  const [val, setVal] = useState(value);
  return (
    <div className="flex items-center gap-2 flex-1">
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(val.trim());
          if (e.key === "Escape") onCancel();
        }}
        placeholder={placeholder}
        className="flex-1 text-sm px-2 py-1 rounded border outline-none"
        style={{ borderColor: "#cc785c", background: "#faf9f5", color: "#141413" }}
      />
      <button
        onClick={() => onSave(val.trim())}
        className="p-1 rounded hover:bg-[#efe9de]"
        style={{ color: "#5db872" }}
      >
        <Check className="w-4 h-4" />
      </button>
      <button onClick={onCancel} className="p-1 rounded hover:bg-[#efe9de]" style={{ color: "#8e8b82" }}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Session row ──────────────────────────────────────────────────────────────

function SessionRow({
  session,
  onUpdate,
  onDelete,
}: {
  session: AdminSession;
  onUpdate: (id: number, updates: Partial<AdminSession>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (title: string) => {
    if (!title) return;
    await onUpdate(session.id, { title });
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm(`세션 "${session.title}"을 삭제하시겠습니까?`)) return;
    setDeleting(true);
    try {
      await onDelete(session.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 hover:bg-[#efe9de]/20 transition-colors"
      style={{ borderColor: "#e6dfd8" }}
    >
      <Video className="w-3.5 h-3.5 shrink-0" style={{ color: "#8e8b82" }} />

      {editing ? (
        <InlineEdit
          value={session.title}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <span className="flex-1 text-sm min-w-0 truncate" style={{ color: "#252523" }}>
            {session.title}
          </span>

          {session.is_preview && (
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
              style={{ background: "#efe9de", color: "#cc785c" }}
            >
              미리보기
            </span>
          )}

          <span className="text-xs shrink-0" style={{ color: "#8e8b82" }}>
            {formatDuration(session.duration_seconds)}
          </span>

          <button
            onClick={() => onUpdate(session.id, { is_preview: !session.is_preview })}
            title={session.is_preview ? "미리보기 해제" : "미리보기 설정"}
            className="p-1 rounded hover:bg-[#efe9de] shrink-0 transition-colors"
            style={{ color: session.is_preview ? "#cc785c" : "#8e8b82" }}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setEditing(true)}
            className="p-1 rounded hover:bg-[#efe9de] shrink-0 transition-colors"
            style={{ color: "#8e8b82" }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1 rounded hover:bg-red-50 shrink-0 transition-colors disabled:opacity-40"
            style={{ color: "#e05252" }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

// ─── Chapter block ────────────────────────────────────────────────────────────

function ChapterBlock({
  chapter,
  onUpdateChapter,
  onDeleteChapter,
  onAddSession,
  onUpdateSession,
  onDeleteSession,
}: {
  chapter: AdminChapter;
  onUpdateChapter: (id: number, title: string) => Promise<void>;
  onDeleteChapter: (id: number) => Promise<void>;
  onAddSession: (chapterId: number, title: string) => Promise<void>;
  onUpdateSession: (id: number, updates: Partial<AdminSession>) => Promise<void>;
  onDeleteSession: (id: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [addingSession, setAddingSession] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSaveChapter = async (title: string) => {
    if (!title) return;
    await onUpdateChapter(chapter.id, title);
    setEditingTitle(false);
  };

  const handleDeleteChapter = async () => {
    if (
      !confirm(
        `챕터 "${chapter.title}"과 그 안의 세션 ${chapter.sessions.length}개를 모두 삭제하시겠습니까?`
      )
    )
      return;
    await onDeleteChapter(chapter.id);
  };

  const handleAddSession = async () => {
    const title = newSessionTitle.trim();
    if (!title) return;
    setSaving(true);
    try {
      await onAddSession(chapter.id, title);
      setNewSessionTitle("");
      setAddingSession(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e6dfd8" }}>
      {/* Chapter header */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ background: "#efe9de" }}
      >
        <button
          onClick={() => setOpen((o) => !o)}
          className="p-0.5 rounded hover:bg-[#e0d8ce] transition-colors"
          style={{ color: "#6c6a64" }}
        >
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {editingTitle ? (
          <InlineEdit
            value={chapter.title}
            onSave={handleSaveChapter}
            onCancel={() => setEditingTitle(false)}
          />
        ) : (
          <>
            <span className="flex-1 text-sm font-semibold min-w-0" style={{ color: "#141413" }}>
              {chapter.title}
            </span>
            <span className="text-xs shrink-0" style={{ color: "#8e8b82" }}>
              {chapter.sessions.length}개 세션
            </span>
            <button
              onClick={() => setEditingTitle(true)}
              className="p-1 rounded hover:bg-[#e0d8ce] shrink-0 transition-colors"
              style={{ color: "#6c6a64" }}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDeleteChapter}
              className="p-1 rounded hover:bg-red-100 shrink-0 transition-colors"
              style={{ color: "#e05252" }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Sessions */}
      {open && (
        <div style={{ background: "#faf9f5" }}>
          {chapter.sessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              onUpdate={onUpdateSession}
              onDelete={onDeleteSession}
            />
          ))}

          {/* Add session row */}
          {addingSession ? (
            <div
              className="flex items-center gap-2 px-4 py-2.5 border-t"
              style={{ borderColor: "#e6dfd8" }}
            >
              <Video className="w-3.5 h-3.5 shrink-0" style={{ color: "#8e8b82" }} />
              <input
                autoFocus
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSession();
                  if (e.key === "Escape") {
                    setAddingSession(false);
                    setNewSessionTitle("");
                  }
                }}
                placeholder="세션 제목 입력"
                className="flex-1 text-sm px-2 py-1 rounded border outline-none"
                style={{ borderColor: "#cc785c", background: "#faf9f5", color: "#141413" }}
              />
              <button
                onClick={handleAddSession}
                disabled={saving || !newSessionTitle.trim()}
                className="p-1 rounded hover:bg-[#efe9de] disabled:opacity-40"
                style={{ color: "#5db872" }}
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setAddingSession(false);
                  setNewSessionTitle("");
                }}
                className="p-1 rounded hover:bg-[#efe9de]"
                style={{ color: "#8e8b82" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingSession(true)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm border-t hover:bg-[#efe9de]/30 transition-colors"
              style={{ borderColor: "#e6dfd8", color: "#8e8b82" }}
            >
              <Plus className="w-3.5 h-3.5" />
              세션 추가
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminLectureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const {
    info,
    chapters,
    loading,
    addChapter,
    updateChapter,
    deleteChapter,
    addSession,
    updateSession,
    deleteSession,
  } = useAdminLectureDetail(id);

  const [addingChapter, setAddingChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [savingChapter, setSavingChapter] = useState(false);

  const handleAddChapter = async () => {
    const title = newChapterTitle.trim();
    if (!title) return;
    setSavingChapter(true);
    try {
      await addChapter(title);
      setNewChapterTitle("");
      setAddingChapter(false);
    } finally {
      setSavingChapter(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl">
      {/* Breadcrumb / back */}
      <Link
        href="/admin/academy/lectures"
        className="inline-flex items-center gap-1 text-sm mb-6 hover:opacity-70 transition-opacity"
        style={{ color: "#8e8b82" }}
      >
        <ChevronLeft className="w-4 h-4" />
        강의 목록
      </Link>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "#cc785c", borderTopColor: "transparent" }}
          />
        </div>
      ) : !info ? (
        <p className="text-sm" style={{ color: "#8e8b82" }}>
          강의를 찾을 수 없습니다.
        </p>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-start justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-semibold" style={{ color: "#141413" }}>
                  {info.title}
                </h1>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={
                    info.is_published
                      ? { background: "#e8f7eb", color: "#5db872" }
                      : { background: "#efe9de", color: "#8e8b82" }
                  }
                >
                  {info.is_published ? "공개 중" : "비공개"}
                </span>
              </div>
              {info.subtitle && (
                <p className="text-sm" style={{ color: "#6c6a64" }}>
                  {info.subtitle}
                </p>
              )}
            </div>
            <Link
              href={`/academy/${id}`}
              target="_blank"
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors shrink-0"
              style={{ borderColor: "#e6dfd8", color: "#6c6a64" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "#cc785c";
                (e.currentTarget as HTMLAnchorElement).style.color = "#cc785c";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "#e6dfd8";
                (e.currentTarget as HTMLAnchorElement).style.color = "#6c6a64";
              }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              강의 페이지
            </Link>
          </div>

          {/* Curriculum section */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: "#252523" }}>
              커리큘럼
              <span className="ml-2 text-sm font-normal" style={{ color: "#8e8b82" }}>
                {chapters.length}개 챕터 ·{" "}
                {chapters.reduce((sum, c) => sum + c.sessions.length, 0)}개 세션
              </span>
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            {chapters.map((chapter) => (
              <ChapterBlock
                key={chapter.id}
                chapter={chapter}
                onUpdateChapter={updateChapter}
                onDeleteChapter={deleteChapter}
                onAddSession={addSession}
                onUpdateSession={updateSession}
                onDeleteSession={deleteSession}
              />
            ))}

            {/* Add chapter */}
            {addingChapter ? (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl border"
                style={{ borderColor: "#cc785c", background: "#faf9f5" }}
              >
                <input
                  autoFocus
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddChapter();
                    if (e.key === "Escape") {
                      setAddingChapter(false);
                      setNewChapterTitle("");
                    }
                  }}
                  placeholder="챕터 제목 입력"
                  className="flex-1 text-sm bg-transparent outline-none"
                  style={{ color: "#141413" }}
                />
                <button
                  onClick={handleAddChapter}
                  disabled={savingChapter || !newChapterTitle.trim()}
                  className="p-1 rounded hover:bg-[#efe9de] disabled:opacity-40"
                  style={{ color: "#5db872" }}
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setAddingChapter(false);
                    setNewChapterTitle("");
                  }}
                  className="p-1 rounded hover:bg-[#efe9de]"
                  style={{ color: "#8e8b82" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingChapter(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed text-sm transition-colors hover:border-[#cc785c] hover:text-[#cc785c]"
                style={{ borderColor: "#e6dfd8", color: "#8e8b82" }}
              >
                <Plus className="w-4 h-4" />
                챕터 추가
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
