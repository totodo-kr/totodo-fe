"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createLecture, fetchInstructorOptions, InstructorOption } from "@/hooks/useAdminLectures";

function instructorLabel(opt: InstructorOption): string {
  return opt.display_name || opt.name || `강사 #${opt.id}`;
}

export default function AdminLectureWritePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [instructorId, setInstructorId] = useState<number | "">("");
  const [instructors, setInstructors] = useState<InstructorOption[]>([]);
  const [loadingInstructors, setLoadingInstructors] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchInstructorOptions().then((list) => {
      setInstructors(list);
      if (list.length === 1) setInstructorId(list[0].id);
    }).finally(() => setLoadingInstructors(false));
  }, []);

  const inputClass = "w-full text-sm px-3 py-2.5 rounded-lg border outline-none transition-colors";
  const inputStyle = { borderColor: "#e6dfd8", background: "#fff", color: "#141413" };
  const labelClass = "text-xs font-semibold mb-1 block";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("강의 제목을 입력하세요."); return; }
    if (!instructorId) { setError("강사를 선택하세요."); return; }

    setSaving(true);
    setError("");

    const result = await createLecture({
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      description: description.trim() || null,
      price,
      instructor_id: Number(instructorId),
    });

    setSaving(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    router.push(`/admin/academy/lectures/${result.id}`);
  };

  return (
    <div className="p-8 max-w-2xl">
      {/* 뒤로가기 */}
      <Link
        href="/admin/academy/lectures"
        className="inline-flex items-center gap-1 text-sm mb-6 transition-opacity hover:opacity-70"
        style={{ color: "#8e8b82" }}
      >
        <ChevronLeft className="w-4 h-4" />
        강의 목록
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "#141413" }}>새 강의 등록</h1>
        <p className="text-sm mt-1" style={{ color: "#8e8b82" }}>
          기본 정보를 입력하세요. 썸네일·챕터·세션은 등록 후 상세 페이지에서 추가할 수 있습니다.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div
          className="rounded-xl border overflow-hidden mb-6"
          style={{ borderColor: "#e6dfd8" }}
        >
          <div className="px-6 py-5 flex flex-col gap-5" style={{ background: "#faf9f5" }}>

            {/* 강사 선택 */}
            <div>
              <label className={labelClass} style={{ color: "#6c6a64" }}>
                강사 <span style={{ color: "#c64545" }}>*</span>
              </label>
              {loadingInstructors ? (
                <div
                  className="h-10 rounded-lg border animate-pulse"
                  style={{ borderColor: "#e6dfd8", background: "#efe9de" }}
                />
              ) : instructors.length === 0 ? (
                <p className="text-sm" style={{ color: "#c64545" }}>
                  등록된 강사가 없습니다. 먼저 강사 계정을 만들어 주세요.
                </p>
              ) : (
                <select
                  value={instructorId}
                  onChange={(e) => setInstructorId(e.target.value === "" ? "" : Number(e.target.value))}
                  className={inputClass}
                  style={{ ...inputStyle, cursor: "pointer" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
                >
                  {instructors.length > 1 && (
                    <option value="">강사를 선택하세요</option>
                  )}
                  {instructors.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {instructorLabel(opt)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 제목 */}
            <div>
              <label className={labelClass} style={{ color: "#6c6a64" }}>
                강의 제목 <span style={{ color: "#c64545" }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 마호의 수채화 클래스"
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
                autoFocus
              />
            </div>

            {/* 부제목 */}
            <div>
              <label className={labelClass} style={{ color: "#6c6a64" }}>부제목</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="한 줄 소개 (선택)"
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
              />
            </div>

            {/* 설명 */}
            <div>
              <label className={labelClass} style={{ color: "#6c6a64" }}>강의 설명</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="강의 상세 설명 (선택)"
                rows={5}
                className={`${inputClass} resize-y`}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
              />
            </div>

            {/* 정가 */}
            <div>
              <label className={labelClass} style={{ color: "#6c6a64" }}>
                정가 (원) — 0 입력 시 무료
              </label>
              <input
                type="number"
                min={0}
                value={price || ""}
                onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
              />
              <p className="mt-1 text-xs" style={{ color: "#8e8b82" }}>
                현재 입력값: {price > 0 ? `${price.toLocaleString()}원` : "무료"}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <p className="mb-4 text-sm" style={{ color: "#c64545" }}>{error}</p>
        )}

        <div className="flex items-center gap-3 justify-end">
          <Link
            href="/admin/academy/lectures"
            className="px-5 py-2.5 rounded-lg text-sm font-medium border transition-colors"
            style={{ borderColor: "#e6dfd8", color: "#6c6a64" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "#efe9de")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "transparent")}
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={saving || !title.trim() || !instructorId}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            style={{ background: "#cc785c", color: "#fff" }}
            onMouseEnter={(e) => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = "#a9583e"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#cc785c"; }}
          >
            {saving ? "등록 중…" : "강의 등록"}
          </button>
        </div>
      </form>
    </div>
  );
}
