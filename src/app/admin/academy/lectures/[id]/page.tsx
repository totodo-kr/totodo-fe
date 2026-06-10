"use client";

import { useState, use, useRef, useMemo } from "react";
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
  ImageIcon,
} from "lucide-react";
import { useAdminLectureDetail, AdminChapter, AdminSession } from "@/hooks/useAdminLectureDetail";
import { createClient } from "@/utils/supabase/client";

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

// mm:ss ↔ seconds 변환 헬퍼
function parseMmss(s: string): number {
  const [m, sec] = s.split(":").map(Number);
  if (isNaN(m) || isNaN(sec)) return 0;
  return m * 60 + sec;
}

function toMmss(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
  const [editTitle, setEditTitle] = useState(session.title);
  const [editDuration, setEditDuration] = useState(toMmss(session.duration_seconds));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openEdit = () => {
    setEditTitle(session.title);
    setEditDuration(toMmss(session.duration_seconds));
    setEditing(true);
  };

  const handleSave = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      await onUpdate(session.id, {
        title: editTitle.trim(),
        duration_seconds: parseMmss(editDuration),
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
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

  const inputStyle = {
    borderColor: "#cc785c",
    background: "#faf9f5",
    color: "#141413",
  };

  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 border-b last:border-b-0 hover:bg-[#efe9de]/20 transition-colors"
      style={{ borderColor: "#e6dfd8" }}
    >
      <Video className="w-3.5 h-3.5 shrink-0" style={{ color: "#8e8b82" }} />

      {editing ? (
        <>
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setEditing(false);
            }}
            placeholder="세션 제목"
            className="flex-1 min-w-0 text-sm px-2 py-1 rounded border outline-none"
            style={inputStyle}
          />
          <input
            value={editDuration}
            onChange={(e) => setEditDuration(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setEditing(false);
            }}
            placeholder="mm:ss"
            className="w-16 text-sm px-2 py-1 rounded border outline-none text-center font-mono shrink-0"
            style={inputStyle}
          />
          <button
            onClick={handleSave}
            disabled={saving || !editTitle.trim()}
            className="p-1 rounded hover:bg-[#efe9de] disabled:opacity-40 shrink-0"
            style={{ color: "#5db872" }}
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => setEditing(false)}
            className="p-1 rounded hover:bg-[#efe9de] shrink-0"
            style={{ color: "#8e8b82" }}
          >
            <X className="w-4 h-4" />
          </button>
        </>
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

          <span className="text-xs font-mono shrink-0" style={{ color: "#8e8b82" }}>
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
            onClick={openEdit}
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
    updateLecture,
    addChapter,
    updateChapter,
    deleteChapter,
    addSession,
    updateSession,
    deleteSession,
  } = useAdminLectureDetail(id);

  const supabase = useMemo(() => createClient(), []);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드 가능합니다.");
      return;
    }
    setUploadingThumbnail(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `lecture-thumbnails/${id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("totodo_pub_storage").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("totodo_pub_storage").getPublicUrl(path);
      await updateLecture({ thumbnail_url: publicUrl });
    } catch {
      alert("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const [editingInfo, setEditingInfo] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState(0);
  const [savingInfo, setSavingInfo] = useState(false);

  const openInfoEdit = () => {
    setEditTitle(info?.title ?? "");
    setEditSubtitle(info?.subtitle ?? "");
    setEditDescription(info?.description ?? "");
    setEditPrice(info?.price ?? 0);
    setEditingInfo(true);
  };

  const handleSaveInfo = async () => {
    if (!editTitle.trim()) return;
    setSavingInfo(true);
    try {
      await updateLecture({
        title: editTitle.trim(),
        subtitle: editSubtitle.trim() || null,
        description: editDescription.trim() || null,
        price: editPrice,
      });
      setEditingInfo(false);
    } finally {
      setSavingInfo(false);
    }
  };

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
          <div className="rounded-xl border mb-8 overflow-hidden" style={{ borderColor: "#e6dfd8" }}>
            {/* Title bar */}
            <div
              className="flex items-center justify-between gap-3 px-5 py-4"
              style={{ background: "#efe9de" }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-xl font-semibold truncate" style={{ color: "#141413" }}>
                  {info.title}
                </h1>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                  style={
                    info.is_published
                      ? { background: "#e8f7eb", color: "#5db872" }
                      : { background: "#fff", color: "#8e8b82" }
                  }
                >
                  {info.is_published ? "공개 중" : "비공개"}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/academy/${id}`}
                  target="_blank"
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
                  style={{ borderColor: "#d0c9c0", color: "#6c6a64", background: "transparent" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "#cc785c";
                    (e.currentTarget as HTMLAnchorElement).style.color = "#cc785c";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "#d0c9c0";
                    (e.currentTarget as HTMLAnchorElement).style.color = "#6c6a64";
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  강의 페이지
                </Link>
                {!editingInfo && (
                  <button
                    onClick={openInfoEdit}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
                    style={{ borderColor: "#d0c9c0", color: "#6c6a64", background: "transparent" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "#cc785c";
                      (e.currentTarget as HTMLButtonElement).style.color = "#cc785c";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "#d0c9c0";
                      (e.currentTarget as HTMLButtonElement).style.color = "#6c6a64";
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    수정
                  </button>
                )}
              </div>
            </div>

            {/* Info body */}
            <div className="px-5 py-4" style={{ background: "#faf9f5" }}>
              {editingInfo ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium" style={{ color: "#6c6a64" }}>제목</label>
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-sm px-3 py-2 rounded-lg border outline-none"
                      style={{ borderColor: "#cc785c", background: "#fff", color: "#141413" }}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium" style={{ color: "#6c6a64" }}>부제목</label>
                    <input
                      value={editSubtitle}
                      onChange={(e) => setEditSubtitle(e.target.value)}
                      placeholder="부제목 (선택)"
                      className="text-sm px-3 py-2 rounded-lg border outline-none"
                      style={{ borderColor: "#e6dfd8", background: "#fff", color: "#141413" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium" style={{ color: "#6c6a64" }}>설명</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="강의 설명 (선택)"
                      rows={5}
                      className="text-sm px-3 py-2 rounded-lg border outline-none resize-y"
                      style={{ borderColor: "#e6dfd8", background: "#fff", color: "#141413" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium" style={{ color: "#6c6a64" }}>정가 (원)</label>
                    <input
                      type="number"
                      min={0}
                      value={editPrice || ""}
                      onChange={(e) => setEditPrice(Number(e.target.value))}
                      placeholder="0 입력 시 무료"
                      className="text-sm px-3 py-2 rounded-lg border outline-none"
                      style={{ borderColor: "#e6dfd8", background: "#fff", color: "#141413" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setEditingInfo(false)}
                      className="text-sm px-4 py-1.5 rounded-lg border transition-colors"
                      style={{ borderColor: "#e6dfd8", color: "#6c6a64" }}
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSaveInfo}
                      disabled={savingInfo || !editTitle.trim()}
                      className="text-sm px-4 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                      style={{ background: "#cc785c", color: "#fff" }}
                    >
                      {savingInfo ? "저장 중…" : "저장"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Thumbnail */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: "#6c6a64" }}>썸네일 이미지</label>
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleThumbnailUpload}
                    />
                    <button
                      onClick={() => thumbnailInputRef.current?.click()}
                      disabled={uploadingThumbnail}
                      className="relative group w-full rounded-lg border overflow-hidden transition-colors"
                      style={{ borderColor: "#e6dfd8", background: "#fff", aspectRatio: "16/9" }}
                    >
                      {info.thumbnail_url ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={info.thumbnail_url}
                            alt="강의 썸네일"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: "rgba(0,0,0,0.45)" }}>
                            <ImageIcon className="w-5 h-5 text-white" />
                            <span className="text-xs text-white font-medium">
                              {uploadingThumbnail ? "업로드 중…" : "이미지 변경"}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
                          style={{ color: "#b0aca4" }}>
                          <ImageIcon className="w-6 h-6" />
                          <span className="text-xs font-medium">
                            {uploadingThumbnail ? "업로드 중…" : "클릭하여 이미지 업로드"}
                          </span>
                        </div>
                      )}
                      {uploadingThumbnail && (
                        <div className="absolute inset-0 flex items-center justify-center"
                          style={{ background: "rgba(255,255,255,0.7)" }}>
                          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                            style={{ borderColor: "#cc785c", borderTopColor: "transparent" }} />
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Text info */}
                  <div className="flex flex-col gap-1.5">
                    {info.subtitle && (
                      <p className="text-sm font-medium" style={{ color: "#3d3d3a" }}>
                        {info.subtitle}
                      </p>
                    )}
                    {info.description ? (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "#6c6a64" }}>
                        {info.description}
                      </p>
                    ) : (
                      <p className="text-sm" style={{ color: "#b0aca4" }}>설명 없음</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs font-medium" style={{ color: "#8e8b82" }}>정가</span>
                      <span className="text-sm font-semibold" style={{ color: "#141413" }}>
                        {info.price > 0 ? `${info.price.toLocaleString()}원` : "무료"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
