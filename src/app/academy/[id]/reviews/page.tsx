"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Star, Pin } from "lucide-react";
import { useLectureReviews } from "@/hooks/useLectureReviews";
import { useMyLectureReview } from "@/hooks/useMyLectureReview";
import { useLectureContext } from "@/contexts/LectureContext";
import { useAuthStore } from "@/store/useAuthStore";
import LoadingSpinner from "@/components/LoadingSpinner";

function StarRating({
  value,
  onChange,
  readOnly = false,
  size = "md",
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [hovered, setHovered] = useState(0);
  const sizeClass = size === "lg" ? "w-8 h-8" : size === "sm" ? "w-4 h-4" : "w-6 h-6";
  const display = hovered || value;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${sizeClass} transition-colors ${
            n <= display ? "text-yellow-400" : "text-gray-600"
          } ${!readOnly ? "cursor-pointer" : ""}`}
          fill={n <= display ? "currentColor" : "none"}
          onMouseEnter={() => !readOnly && setHovered(n)}
          onMouseLeave={() => !readOnly && setHovered(0)}
          onClick={() => !readOnly && onChange?.(n)}
        />
      ))}
    </div>
  );
}

function ReviewForm({
  initialRating = 0,
  initialContent = "",
  onSubmit,
  onCancel,
  submitting,
}: {
  initialRating?: number;
  initialContent?: string;
  onSubmit: (rating: number, content: string) => void;
  onCancel?: () => void;
  submitting: boolean;
}) {
  const [rating, setRating] = useState(initialRating);
  const [content, setContent] = useState(initialContent);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { alert("별점을 선택해주세요."); return; }
    onSubmit(rating, content);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-white/10 rounded-xl p-6 bg-zinc-900/50 mb-8"
    >
      <h3 className="text-lg font-bold text-white mb-4">리뷰 작성</h3>
      <div className="mb-4">
        <p className="text-sm text-gray-400 mb-2">별점 <span className="text-red-400">*</span></p>
        <StarRating value={rating} onChange={setRating} size="lg" />
      </div>
      <div className="mb-4">
        <p className="text-sm text-gray-400 mb-2">내용 (선택)</p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="강의에 대한 솔직한 후기를 남겨주세요."
          rows={4}
          className="w-full bg-zinc-800 border border-white/10 rounded-lg p-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
        />
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
        >
          {submitting ? "등록 중..." : "등록하기"}
        </button>
      </div>
    </form>
  );
}

export default function LectureReviewsPage() {
  const params = useParams();
  const lectureId = params.id as string;
  const { user } = useAuthStore();
  const { isEnrolled } = useLectureContext();

  const { pinnedReviews, reviews, averageRating, totalCount, loading, fetchReviews } =
    useLectureReviews(lectureId);
  const { myReview, fetchMyReview, submitReview, updateReview } = useMyLectureReview(
    lectureId,
    user?.id
  );

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    if (user) fetchMyReview();
  }, [user, fetchMyReview]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const handleSubmit = async (rating: number, content: string) => {
    setSubmitting(true);
    const ok = myReview
      ? await updateReview(rating, content)
      : await submitReview(rating, content);
    setSubmitting(false);

    if (ok) {
      setShowForm(false);
      fetchReviews();
    } else {
      alert("리뷰 등록 중 오류가 발생했습니다.");
    }
  };

  const allReviews = [...pinnedReviews, ...reviews];

  return (
    <div className="py-4">
      {/* Summary Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="text-5xl font-bold text-white">{averageRating > 0 ? averageRating.toFixed(1) : "-"}</div>
        <div>
          <StarRating value={Math.round(averageRating)} readOnly size="md" />
          <p className="text-sm text-gray-500 mt-1">총 {totalCount}개 리뷰</p>
        </div>
        {isEnrolled && !myReview && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="ml-auto px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-full text-sm font-bold transition-colors"
          >
            리뷰 쓰기
          </button>
        )}
        {isEnrolled && myReview && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="ml-auto px-5 py-2 border border-white/20 text-gray-300 hover:text-white hover:border-white/40 rounded-full text-sm font-bold transition-colors"
          >
            내 리뷰 수정
          </button>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <ReviewForm
          initialRating={myReview?.rating ?? 0}
          initialContent={myReview?.content ?? ""}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
          submitting={submitting}
        />
      )}

      {/* Reviews List */}
      {loading ? (
        <LoadingSpinner className="py-16" />
      ) : allReviews.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p>아직 리뷰가 없습니다.</p>
          {isEnrolled && !showForm && (
            <p className="mt-2 text-sm">수강생 여러분의 첫 리뷰를 남겨주세요!</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Pinned */}
          {pinnedReviews.length > 0 && (
            <div className="flex flex-col gap-4 mb-2">
              {pinnedReviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-xl border border-brand-500/30 bg-zinc-900/70 px-6 py-5"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Pin className="w-3.5 h-3.5 text-brand-400 rotate-45 shrink-0" fill="currentColor" />
                    <span className="text-xs text-brand-400 font-semibold">고정 리뷰</span>
                  </div>
                  <ReviewCard review={review} formatDate={formatDate} />
                </div>
              ))}
            </div>
          )}

          {/* Normal */}
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-xl border border-white/8 bg-zinc-900/40 px-6 py-5"
            >
              <ReviewCard review={review} formatDate={formatDate} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  review,
  formatDate,
}: {
  review: import("@/hooks/useLectureReviews").LectureReview;
  formatDate: (s: string) => string;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-gray-300 shrink-0 overflow-hidden">
            {review.profiles?.avatar_url ? (
              <img src={review.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              review.profiles?.display_name?.[0] || "?"
            )}
          </div>
          <span className="font-semibold text-gray-200 text-sm">
            {review.profiles?.display_name || "알 수 없음"}
          </span>
          <span className="text-xs text-gray-500">{formatDate(review.created_at)}</span>
        </div>
        <StarRating value={review.rating} readOnly size="sm" />
      </div>
      {review.content && (
        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap pl-11">
          {review.content}
        </p>
      )}
    </>
  );
}
