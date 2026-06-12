"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { Pencil, Trash2, Plus, X, Users } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  useAdminMissions,
  useAdminMissionSubmissions,
  MissionInput,
  SubmissionStatus,
} from "@/hooks/useAdminMissions";
import { AdminPageHeader, AdminTable } from "@/components/admin/organisms";
import {
  ResultCount,
  FilterTabs,
  IconActionButton,
} from "@/components/admin/molecules";
import { Badge, Spinner } from "@/components/admin/atoms";

interface Chapter {
  id: number;
  title: string;
  order_index: number;
}

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  submitted: "제출됨",
  reviewed: "검토중",
  passed: "통과",
};

const STATUS_COLORS: Record<SubmissionStatus, { bg: string; color: string }> = {
  submitted: { bg: "#dbeafe", color: "#2563eb" },
  reviewed: { bg: "#fef9c3", color: "#854d0e" },
  passed: { bg: "#d1fae5", color: "#065f46" },
};

const MISSION_COLS = [
  { label: "챕터", className: "text-center" },
  { label: "제목" },
  { label: "마감일", className: "text-center" },
  { label: "제출 수", className: "text-center" },
  { label: "관리", className: "text-center" },
];
const MISSION_GRID = "120px 1fr 130px 80px 110px";

const SUBMISSION_COLS = [
  { label: "제출자" },
  { label: "내용" },
  { label: "파일" },
  { label: "상태", className: "text-center" },
  { label: "피드백" },
  { label: "관리", className: "text-center" },
];
const SUBMISSION_GRID = "120px 1fr 80px 90px 1fr 140px";

const EMPTY_FORM: MissionInput = {
  chapter_id: 0,
  title: "",
  description: "",
  due_date: "",
};

function formatDate(s: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateInput(s: string | null) {
  if (!s) return "";
  return s.slice(0, 16);
}

export default function AdminMissionsPage() {
  const params = useParams();
  const lectureId = params.id as string;
  const supabase = useMemo(() => createClient(), []);

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<number | undefined>(undefined);

  const { missions, loading, pendingId, fetchMissions, createMission, updateMission, deleteMission } =
    useAdminMissions(lectureId);

  // 제출 현황 드로어
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [selectedMissionTitle, setSelectedMissionTitle] = useState("");
  const { submissions, loading: subLoading, pendingId: subPendingId, fetchSubmissions, updateSubmission } =
    useAdminMissionSubmissions(selectedMissionId);

  // 제출 피드백 편집
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [subStatus, setSubStatus] = useState<SubmissionStatus>("submitted");
  const [subFeedback, setSubFeedback] = useState("");
  const [subSaving, setSubSaving] = useState(false);

  // 미션 폼
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MissionInput>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 챕터 목록 로드
  useEffect(() => {
    if (!lectureId) return;
    supabase
      .from("lecture_chapters")
      .select("id, title, order_index")
      .eq("lecture_id", lectureId)
      .order("order_index")
      .then(({ data }) => {
        const list = (data ?? []) as Chapter[];
        setChapters(list);
      });
  }, [lectureId, supabase]);

  const load = useCallback(
    (chapterId?: number) => fetchMissions(chapterId),
    [fetchMissions]
  );

  useEffect(() => {
    load(activeChapterId);
  }, [load, activeChapterId]);

  useEffect(() => {
    if (selectedMissionId) fetchSubmissions();
  }, [selectedMissionId, fetchSubmissions]);

  const chapterTabs = [
    { value: 0, label: "전체" },
    ...chapters.map((c) => ({ value: c.id, label: c.title })),
  ];

  const handleChapterFilter = (val: number) => {
    const id = val === 0 ? undefined : val;
    setActiveChapterId(id);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, chapter_id: chapters[0]?.id ?? 0 });
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (m: (typeof missions)[0]) => {
    setEditingId(m.id);
    setForm({
      chapter_id: m.chapter_id,
      title: m.title,
      description: m.description ?? "",
      due_date: formatDateInput(m.due_date),
    });
    setFormError("");
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.chapter_id) { setFormError("챕터를 선택하세요."); return; }
    if (!form.title.trim()) { setFormError("제목을 입력하세요."); return; }

    setSaving(true);
    setFormError("");
    const dueIso = form.due_date ? new Date(form.due_date).toISOString() : "";
    const payload = { ...form, due_date: dueIso };

    const result = editingId
      ? await updateMission(editingId, payload)
      : await createMission(payload);

    setSaving(false);
    if (!result.ok) { setFormError(result.error ?? "저장 실패"); return; }
    closeForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 미션을 삭제하시겠습니까? 모든 제출물도 삭제됩니다.")) return;
    setDeletingId(id);
    await deleteMission(id);
    setDeletingId(null);
  };

  const openSubmissions = (missionId: string, title: string) => {
    setSelectedMissionId(missionId);
    setSelectedMissionTitle(title);
    setEditingSubId(null);
  };

  const closeSubmissions = () => {
    setSelectedMissionId(null);
    setSelectedMissionTitle("");
    setEditingSubId(null);
  };

  const openSubEdit = (sub: (typeof submissions)[0]) => {
    setEditingSubId(sub.id);
    setSubStatus(sub.status);
    setSubFeedback(sub.feedback ?? "");
  };

  const handleSubSave = async (subId: string) => {
    setSubSaving(true);
    const result = await updateSubmission(subId, subStatus, subFeedback);
    setSubSaving(false);
    if (!result.ok) { alert(result.error ?? "저장 실패"); return; }
    setEditingSubId(null);
  };

  const filteredMissions = activeChapterId
    ? missions.filter((m) => m.chapter_id === activeChapterId)
    : missions;

  return (
    <div className="p-8 max-w-6xl">
      <AdminPageHeader
        title="미션 관리"
        description="챕터별 과제를 출제하고 수강자 제출물을 검토합니다."
        action={{ label: "미션 추가", onClick: openCreate }}
      />

      {/* 챕터 필터 */}
      {chapters.length > 0 && (
        <FilterTabs
          tabs={chapterTabs}
          active={activeChapterId ?? 0}
          onChange={handleChapterFilter}
        />
      )}

      <div className="flex items-center justify-end mb-4">
        <ResultCount total={filteredMissions.length} unit="개" />
      </div>

      <AdminTable
        columns={MISSION_COLS}
        gridTemplateColumns={MISSION_GRID}
        loading={loading}
        isEmpty={filteredMissions.length === 0}
        emptyMessage="등록된 미션이 없습니다."
      >
        {filteredMissions.map((m) => (
          <div
            key={m.id}
            className="grid items-center px-5 py-3.5 border-b last:border-b-0 hover:bg-[#efe9de]/30 transition-colors"
            style={{ gridTemplateColumns: MISSION_GRID, borderColor: "#e6dfd8" }}
          >
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium truncate text-center"
              style={{ background: "#efe9de", color: "#6c6a64" }}
            >
              {m.chapter_title ?? "-"}
            </span>
            <span className="font-medium text-sm truncate px-2" style={{ color: "#252523" }}>
              {m.title}
            </span>
            <span className="text-sm text-center" style={{ color: "#6c6a64" }}>
              {formatDate(m.due_date)}
            </span>
            <button
              onClick={() => openSubmissions(m.id, m.title)}
              className="flex items-center justify-center gap-1 text-sm font-medium transition-colors"
              style={{ color: "#cc785c" }}
            >
              <Users size={14} />
              {m.submission_count ?? 0}
            </button>
            <div className="flex items-center justify-center gap-2">
              <IconActionButton
                icon={<Pencil size={14} />}
                onClick={() => openEdit(m)}
                loading={false}
                variant="default"
                title="수정"
              />
              <IconActionButton
                icon={<Trash2 size={14} />}
                onClick={() => handleDelete(m.id)}
                loading={deletingId === m.id || pendingId === m.id}
                variant="danger"
                title="삭제"
              />
            </div>
          </div>
        ))}
      </AdminTable>

      {/* 미션 폼 모달 */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form
            onSubmit={handleSave}
            className="rounded-2xl shadow-2xl p-7 w-full max-w-lg"
            style={{ background: "#faf9f5" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ color: "#141413" }}>
                {editingId ? "미션 수정" : "미션 추가"}
              </h3>
              <button type="button" onClick={closeForm}>
                <X size={20} style={{ color: "#8e8b82" }} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: "#6c6a64" }}>챕터 *</label>
                <select
                  value={form.chapter_id}
                  onChange={(e) => setForm((f) => ({ ...f, chapter_id: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: "#e6dfd8", background: "#fff", color: "#141413" }}
                >
                  <option value={0}>챕터 선택</option>
                  {chapters.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: "#6c6a64" }}>제목 *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="미션 제목"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: "#e6dfd8", background: "#fff", color: "#141413" }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: "#6c6a64" }}>설명</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="과제 설명 (선택)"
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ borderColor: "#e6dfd8", background: "#fff", color: "#141413" }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: "#6c6a64" }}>마감일</label>
                <input
                  type="datetime-local"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: "#e6dfd8", background: "#fff", color: "#141413" }}
                />
              </div>

              {formError && (
                <p className="text-xs" style={{ color: "#c64545" }}>{formError}</p>
              )}
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ background: "#efe9de", color: "#6c6a64" }}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                style={{ background: "#cc785c", color: "#fff" }}
              >
                {saving ? "저장 중…" : "저장"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 제출 현황 드로어 */}
      {selectedMissionId && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={closeSubmissions} />
          <div
            className="w-full max-w-3xl h-full overflow-y-auto shadow-2xl flex flex-col"
            style={{ background: "#faf9f5" }}
          >
            <div
              className="flex items-center justify-between px-7 py-5 border-b sticky top-0"
              style={{ background: "#faf9f5", borderColor: "#e6dfd8" }}
            >
              <div>
                <p className="text-xs mb-0.5" style={{ color: "#8e8b82" }}>제출 현황</p>
                <h3 className="text-base font-bold" style={{ color: "#141413" }}>
                  {selectedMissionTitle}
                </h3>
              </div>
              <button onClick={closeSubmissions}>
                <X size={20} style={{ color: "#8e8b82" }} />
              </button>
            </div>

            <div className="flex-1 p-7">
              {subLoading ? (
                <div className="flex justify-center py-12">
                  <Spinner size="md" />
                </div>
              ) : submissions.length === 0 ? (
                <p className="text-center py-12 text-sm" style={{ color: "#8e8b82" }}>
                  제출된 과제가 없습니다.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {submissions.map((sub) => {
                    const authorName =
                      sub.profiles?.display_name || sub.profiles?.name || "탈퇴한 유저";
                    const isEditing = editingSubId === sub.id;

                    return (
                      <div
                        key={sub.id}
                        className="rounded-xl border p-5"
                        style={{ borderColor: "#e6dfd8", background: "#fff" }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm" style={{ color: "#252523" }}>
                              {authorName}
                            </span>
                            <span className="text-xs" style={{ color: "#8e8b82" }}>
                              {formatDate(sub.created_at)}
                            </span>
                          </div>
                          <Badge bg={STATUS_COLORS[sub.status].bg} color={STATUS_COLORS[sub.status].color}>
                            {STATUS_LABELS[sub.status]}
                          </Badge>
                        </div>

                        {sub.content && (
                          <p className="text-sm mb-3 whitespace-pre-wrap" style={{ color: "#252523" }}>
                            {sub.content}
                          </p>
                        )}

                        {sub.file_url && (
                          <a
                            href={sub.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs underline mb-3"
                            style={{ color: "#cc785c" }}
                          >
                            첨부파일 보기
                          </a>
                        )}

                        {sub.feedback && !isEditing && (
                          <div
                            className="rounded-lg px-3 py-2 text-xs mb-3"
                            style={{ background: "#efe9de", color: "#6c6a64" }}
                          >
                            <span className="font-semibold">피드백: </span>
                            {sub.feedback}
                          </div>
                        )}

                        {isEditing ? (
                          <div className="flex flex-col gap-2 mt-2">
                            <select
                              value={subStatus}
                              onChange={(e) => setSubStatus(e.target.value as SubmissionStatus)}
                              className="w-full px-3 py-2 rounded-lg border text-sm"
                              style={{ borderColor: "#e6dfd8", background: "#fff", color: "#141413" }}
                            >
                              <option value="submitted">제출됨</option>
                              <option value="reviewed">검토중</option>
                              <option value="passed">통과</option>
                            </select>
                            <textarea
                              value={subFeedback}
                              onChange={(e) => setSubFeedback(e.target.value)}
                              placeholder="피드백 작성 (선택)"
                              rows={3}
                              className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                              style={{ borderColor: "#e6dfd8", background: "#fff", color: "#141413" }}
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setEditingSubId(null)}
                                className="px-3 py-1.5 rounded-lg text-xs"
                                style={{ background: "#efe9de", color: "#6c6a64" }}
                              >
                                취소
                              </button>
                              <button
                                onClick={() => handleSubSave(sub.id)}
                                disabled={subSaving || subPendingId === sub.id}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                                style={{ background: "#cc785c", color: "#fff" }}
                              >
                                {subSaving && subPendingId === sub.id ? "저장 중…" : "저장"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => openSubEdit(sub)}
                            className="text-xs font-medium mt-1"
                            style={{ color: "#cc785c" }}
                          >
                            피드백 / 상태 변경
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
