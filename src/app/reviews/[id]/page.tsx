"use client";

/**
 * TODO
 * 글 상세로 들어왔을 때, 남의 글이면
 * 제목 옆 ... 버튼 누를 때 신고, 게시글 숨김, 작성자 차단 기능 추가 필요
 * 댓글도 동일
 */

import { ChevronLeft, MessageSquare, MoreHorizontal } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useProfile } from "@/hooks/useProfile";

interface ReviewDetail {
  id: number;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  is_pinned?: boolean;
  profiles: {
    display_name: string | null;
    avatar_url?: string | null;
  } | null;
  review_attachments?: {
    file_url: string;
    file_name: string;
    file_type: string;
  }[];
}

interface Comment {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    display_name: string | null;
    avatar_url?: string | null;
  } | null;
}

export default function ReviewDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuthStore();
  const { profile } = useProfile(user);
  const supabase = createClient();

  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPinning, setIsPinning] = useState(false);
  const [openCommentMenuId, setOpenCommentMenuId] = useState<number | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const commentMenuRef = useRef<HTMLDivElement | null>(null);

  const fetchReviewDetail = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select(
          `
          *,
          profiles:user_id (display_name, avatar_url),
          review_attachments (*)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      setReview(data as ReviewDetail);

      // 조회수 증가 (선택사항)
      // await supabase.rpc('increment_view_count', { row_id: id });
    } catch (error) {
      console.error("Error fetching review:", error);
      alert("게시글을 불러오는데 실패했습니다.");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router, supabase]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setIsActionOpen(false);
      }
      if (commentMenuRef.current && !commentMenuRef.current.contains(event.target as Node)) {
        setOpenCommentMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchComments = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from("review_comments")
        .select(
          `
          *,
          profiles:user_id (display_name, avatar_url)
        `
        )
        .eq("review_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments((data as Comment[]) || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  }, [id, supabase]);

  useEffect(() => {
    if (id) {
      fetchReviewDetail();
      fetchComments();
    }
  }, [id, fetchComments, fetchReviewDetail]);

  const handleSubmitComment = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (!newComment.trim()) return;

    setCommentSubmitting(true);
    try {
      const { error } = await supabase.from("review_comments").insert({
        review_id: id,
        user_id: user.id,
        content: newComment,
      });

      if (error) throw error;

      setNewComment("");
      fetchComments(); // 댓글 목록 새로고침
    } catch (error) {
      console.error("Error submitting comment:", error);
      alert("댓글 등록에 실패했습니다.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return <div className="min-h-screen p-8 text-center text-gray-500">로딩 중...</div>;
  }

  if (!review) return null;

  const isOwner = user?.id === review.user_id;
  const isAdmin = profile?.role === "admin";
  const canDeletePost = isOwner || isAdmin;

  const extractStoragePath = (url: string) => {
    try {
      const path = new URL(url).pathname;
      const marker = "/review_files/";
      const index = path.indexOf(marker);
      if (index === -1) return null;
      return decodeURIComponent(path.slice(index + marker.length));
    } catch {
      return null;
    }
  };

  const handleDelete = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (!canDeletePost) {
      alert("삭제 권한이 없습니다.");
      return;
    }
    const confirmed = confirm("정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.");
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      // 첨부파일 스토리지 정리
      const attachmentPaths =
        review.review_attachments
          ?.map((file) => extractStoragePath(file.file_url))
          .filter((v): v is string => Boolean(v)) || [];

      if (attachmentPaths.length > 0) {
        const { error: storageError } = await supabase.storage.from("review_files").remove(attachmentPaths);
        if (storageError) {
          console.warn("파일 삭제 중 오류", storageError);
        }
      }

      await supabase.from("review_attachments").delete().eq("review_id", id);

      const deleteQuery = supabase.from("reviews").delete().eq("id", id);
      const { error } = canDeletePost && !isOwner ? await deleteQuery : await deleteQuery.eq("user_id", user.id);
      if (error) throw error;

      alert("삭제되었습니다.");
      router.push("/reviews");
      router.refresh();
    } catch (error) {
      console.error("Error deleting review:", error);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePinToggle = async () => {
    if (!isAdmin) {
      alert("고정 권한이 없습니다.");
      return;
    }

    const nextPinned = !review.is_pinned;
    const confirmed = confirm(
      nextPinned ? "이 게시글을 고정하시겠습니까?" : "이 게시글을 고정 해제하시겠습니까?"
    );
    if (!confirmed) return;

    setIsPinning(true);
    try {
      const { error } = await supabase.from("reviews").update({ is_pinned: nextPinned }).eq("id", id);
      if (error) throw error;
      setReview((prev) => (prev ? { ...prev, is_pinned: nextPinned } : prev));
      alert(nextPinned ? "게시글이 고정되었습니다." : "고정이 해제되었습니다.");
      router.refresh();
    } catch (error) {
      console.error("Error pinning review:", error);
      alert("고정 처리 중 오류가 발생했습니다.");
    } finally {
      setIsPinning(false);
    }
  };

  const handleDeleteComment = async (commentId: number, authorId: string) => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (user.id !== authorId) {
      alert("삭제 권한이 없습니다.");
      return;
    }
    const confirmed = confirm("댓글을 삭제하시겠습니까?");
    if (!confirmed) return;

    setDeletingCommentId(commentId);
    try {
      const { error } = await supabase
        .from("review_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id);
      if (error) throw error;

      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setOpenCommentMenuId(null);
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("댓글 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingCommentId(null);
    }
  };

  return (
    <main className="min-h-screen p-8 mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.push("/reviews")}
        className="flex items-center text-gray-400 hover:text-white transition-colors mb-8 group"
      >
        <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
        뒤로 가기
      </button>

      {/* Header */}
      <header className="mb-8 border-b border-white/10 pb-8">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold text-white mb-4">{review.title}</h1>
          {(isOwner || isAdmin) && (
            <div ref={actionMenuRef} className="relative">
              <button
                onClick={() => setIsActionOpen((prev) => !prev)}
                className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                aria-label="게시글 메뉴"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {isActionOpen && (
                <div className="absolute right-0 mt-2 w-32 rounded-lg border border-white/10 bg-zinc-900 shadow-lg overflow-hidden">
                  
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setIsActionOpen(false);
                        if (!isPinning) handlePinToggle();
                      }}
                      disabled={isPinning}
                      className="w-full px-4 py-2 text-left text-sm text-brand-400 hover:bg-brand-500/10 transition-colors disabled:opacity-50"
                    >
                      {isPinning
                        ? "처리 중..."
                        : review.is_pinned
                        ? "고정 해제"
                        : "고정"}
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => {
                        setIsActionOpen(false);
                        router.push(`/reviews/${id}/edit`);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-white/5 transition-colors"
                    >
                      수정
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsActionOpen(false);
                      if (!isDeleting) handleDelete();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    disabled={isDeleting}
                  >
                    {isDeleting ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 text-gray-500">
          <div className="flex items-center gap-2">
            {review.profiles?.avatar_url && (
              <img
                src={review.profiles.avatar_url}
                alt="Profile"
                className="w-6 h-6 rounded-full object-cover"
              />
            )}
            <span>{review.profiles?.display_name || "알 수 없음"}</span>
          </div>
          <span className="w-1 h-1 rounded-full bg-gray-700" />
          <span>{formatDate(review.created_at)}</span>
        </div>
      </header>

      {/* Content */}
      <div
        className="text-gray-300 leading-relaxed text-lg mb-12 min-h-[200px] prose prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: review.content }}
      />

      {/* Attachments */}
      {review.review_attachments && review.review_attachments.length > 0 && (
        <div className="mb-16 border-t border-white/10 pt-6">
          <h4 className="text-sm font-bold text-gray-400 mb-3">첨부파일</h4>
          <div className="flex flex-col gap-2">
            {review.review_attachments.map((file, index) => (
              <a
                key={index}
                href={file.file_url}
                target="_blank"
                rel="noreferrer"
                className="text-brand-500 hover:underline flex items-center gap-2 w-fit"
              >
                <span>📎 {file.file_name}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Comments Section */}
      <div className="border-t border-white/10 pt-8">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          댓글 ({comments.length})
        </h3>

        {/* Comment Input */}
        <div className="flex gap-4 mb-8">
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-white font-bold shrink-0 overflow-hidden">
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Me"
                className="w-full h-full object-cover"
              />
            ) : (
              "나"
            )}
          </div>
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={user ? "댓글을 남겨보세요..." : "로그인이 필요합니다."}
              disabled={!user || commentSubmitting}
              className="w-full h-24 bg-zinc-900 border border-white/10 rounded-xl p-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-500 transition-colors resize-none disabled:opacity-50"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSubmitComment}
                disabled={!user || commentSubmitting || !newComment.trim()}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {commentSubmitting ? "등록 중..." : "등록"}
              </button>
            </div>
          </div>
        </div>

        {/* Comment List */}
        <div className="flex flex-col gap-6">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">첫 번째 댓글을 남겨보세요!</div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
                  {comment.profiles?.avatar_url ? (
                    <img
                      src={comment.profiles.avatar_url}
                      alt="User"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    comment.profiles?.display_name?.[0] || "?"
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-200">
                        {comment.profiles?.display_name || "알 수 없음"}
                      </span>
                      <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                    </div>
                    {user?.id === comment.user_id && (
                      <div
                        ref={openCommentMenuId === comment.id ? commentMenuRef : null}
                        className="relative shrink-0"
                      >
                        <button
                          onClick={() =>
                            setOpenCommentMenuId((prev) => (prev === comment.id ? null : comment.id))
                          }
                          className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                          aria-label="댓글 메뉴"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {openCommentMenuId === comment.id && (
                          <div className="absolute right-0 mt-2 w-28 rounded-lg border border-white/10 bg-zinc-900 shadow-lg overflow-hidden">
                            <button
                              onClick={() => handleDeleteComment(comment.id, comment.user_id)}
                              disabled={deletingCommentId === comment.id}
                              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                            >
                              {deletingCommentId === comment.id ? "삭제 중..." : "삭제"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {comment.content}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
