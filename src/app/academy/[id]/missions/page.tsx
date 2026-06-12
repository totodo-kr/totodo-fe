"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { ChevronDown, ChevronUp, Paperclip, Send, CheckCircle2, Clock, BookOpen } from "lucide-react";
import { useMissions, MissionWithSubmission } from "@/hooks/useMissions";
import { useLectureContext } from "@/contexts/LectureContext";
import LoadingSpinner from "@/components/LoadingSpinner";

const STATUS_LABELS = {
  submitted: "제출 완료",
  reviewed: "검토중",
  passed: "통과",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  submitted: <CheckCircle2 size={14} style={{ color: "#2563eb" }} />,
  reviewed: <Clock size={14} style={{ color: "#ca8a04" }} />,
  passed: <CheckCircle2 size={14} style={{ color: "#16a34a" }} />,
};

function formatDue(s: string | null) {
  if (!s) return null;
  const d = new Date(s);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  const label = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  const urgent = diff < 0 ? "마감됨" : days <= 3 ? `D-${days}` : null;
  return { label, urgent, expired: diff < 0 };
}

interface MissionCardProps {
  mission: MissionWithSubmission;
  onSubmit: (missionId: string, content: string, file: File | null) => Promise<void>;
}

function MissionCard({ mission, onSubmit }: MissionCardProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(mission.submission?.content ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const due = formatDue(mission.due_date);
  const hasSubmission = !!mission.submission;
  const isExpired = due?.expired ?? false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !file) { setError("내용 또는 파일을 첨부하세요."); return; }
    setError("");
    setSubmitting(true);
    await onSubmit(mission.id, content, file);
    setSubmitting(false);
    setFile(null);
    setOpen(false);
  };

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: "#e6dfd8", background: "#fff" }}
    >
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[#faf9f5]"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <BookOpen size={16} style={{ color: "#cc785c", flexShrink: 0 }} />
          <span className="font-semibold text-sm truncate" style={{ color: "#141413" }}>
            {mission.title}
          </span>
        </div>
        <div className="flex items-center gap-3 ml-4 shrink-0">
          {due && (
            <span className="text-xs" style={{ color: due.expired ? "#c64545" : "#8e8b82" }}>
              {due.label}
              {due.urgent && (
                <span
                  className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold"
                  style={{
                    background: due.expired ? "#fde8e8" : "#fef9c3",
                    color: due.expired ? "#c64545" : "#854d0e",
                  }}
                >
                  {due.urgent}
                </span>
              )}
            </span>
          )}
          {hasSubmission && (
            <span
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: mission.submission!.status === "passed" ? "#d1fae5" : "#dbeafe",
                color: mission.submission!.status === "passed" ? "#065f46" : "#2563eb",
              }}
            >
              {STATUS_ICONS[mission.submission!.status]}
              {STATUS_LABELS[mission.submission!.status]}
            </span>
          )}
          {open
            ? <ChevronUp size={16} style={{ color: "#8e8b82" }} />
            : <ChevronDown size={16} style={{ color: "#8e8b82" }} />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t" style={{ borderColor: "#e6dfd8" }}>
          {mission.description && (
            <p className="text-sm mt-4 mb-4 whitespace-pre-wrap leading-relaxed" style={{ color: "#252523" }}>
              {mission.description}
            </p>
          )}

          {hasSubmission && (
            <div
              className="rounded-lg px-4 py-3 mb-4 text-sm"
              style={{ background: "#efe9de" }}
            >
              <div className="flex items-center gap-2 mb-1 font-semibold" style={{ color: "#252523" }}>
                {STATUS_ICONS[mission.submission!.status]}
                {STATUS_LABELS[mission.submission!.status]}
              </div>
              {mission.submission!.content && (
                <p className="text-xs mb-2 whitespace-pre-wrap" style={{ color: "#6c6a64" }}>
                  {mission.submission!.content}
                </p>
              )}
              {mission.submission!.file_url && (
                <a
                  href={mission.submission!.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline"
                  style={{ color: "#cc785c" }}
                >
                  첨부파일 보기
                </a>
              )}
              {mission.submission!.feedback && (
                <div className="mt-2 pt-2 border-t" style={{ borderColor: "#e6dfd8" }}>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: "#6c6a64" }}>강사 피드백</p>
                  <p className="text-xs" style={{ color: "#252523" }}>{mission.submission!.feedback}</p>
                </div>
              )}
            </div>
          )}

          {!isExpired && mission.submission?.status !== "passed" && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="과제 내용을 입력하세요"
                rows={4}
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                style={{ borderColor: "#e6dfd8", background: "#faf9f5", color: "#141413" }}
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-[#efe9de]"
                  style={{ borderColor: "#e6dfd8", color: "#6c6a64" }}
                >
                  <Paperclip size={13} />
                  {file ? file.name : "파일 첨부"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="ml-auto flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg font-bold disabled:opacity-50"
                  style={{ background: "#cc785c", color: "#fff" }}
                >
                  <Send size={13} />
                  {submitting ? "제출 중…" : hasSubmission ? "재제출" : "제출하기"}
                </button>
              </div>
              {error && <p className="text-xs" style={{ color: "#c64545" }}>{error}</p>}
            </form>
          )}

          {isExpired && !hasSubmission && (
            <p className="text-xs text-center py-2" style={{ color: "#8e8b82" }}>
              마감된 과제입니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function MissionsPage() {
  const params = useParams();
  const lectureId = params.id as string;
  const { isEnrolled } = useLectureContext();
  const { missions, loading, fetchMissions, submitMission, uploadFile } = useMissions(lectureId);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const handleSubmit = async (missionId: string, content: string, file: File | null) => {
    let fileUrl: string | null = null;
    if (file) {
      const { url, error } = await uploadFile(file);
      if (error) { alert(`파일 업로드 실패: ${error}`); return; }
      fileUrl = url;
    }
    const result = await submitMission(missionId, content, fileUrl);
    if (!result.ok) alert(result.error ?? "제출 실패");
  };

  if (!isEnrolled) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-2">
        <p className="text-base font-semibold" style={{ color: "#252523" }}>수강 신청 후 이용할 수 있습니다.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (missions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-2">
        <p className="text-base font-semibold" style={{ color: "#252523" }}>등록된 과제가 없습니다.</p>
        <p className="text-sm" style={{ color: "#8e8b82" }}>강사가 과제를 등록하면 여기에 표시됩니다.</p>
      </div>
    );
  }

  // 챕터별 그룹화
  const grouped: { chapterId: number; chapterTitle: string; chapterOrder: number; items: MissionWithSubmission[] }[] = [];
  const seen = new Set<number>();
  for (const m of missions) {
    if (!seen.has(m.chapter_id)) {
      seen.add(m.chapter_id);
      grouped.push({ chapterId: m.chapter_id, chapterTitle: m.chapter_title, chapterOrder: m.chapter_order, items: [] });
    }
    grouped.find((g) => g.chapterId === m.chapter_id)!.items.push(m);
  }
  grouped.sort((a, b) => a.chapterOrder - b.chapterOrder);

  return (
    <div className="flex flex-col gap-8">
      {grouped.map((group) => (
        <section key={group.chapterId}>
          <h2 className="text-sm font-bold mb-3 px-1" style={{ color: "#8e8b82" }}>
            {group.chapterTitle}
          </h2>
          <div className="flex flex-col gap-3">
            {group.items.map((m) => (
              <MissionCard key={m.id} mission={m} onSubmit={handleSubmit} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
