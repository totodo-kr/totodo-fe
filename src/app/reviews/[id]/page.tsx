"use client";

import { ChevronLeft, MessageSquare } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";

interface ReviewDetail {
  id: number;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
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
  const id = params.id;
  const { user } = useAuthStore();
  const supabase = createClient();

  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchReviewDetail();
      fetchComments();
    }
  }, [id]);

  const fetchReviewDetail = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          *,
          profiles:user_id (display_name, avatar_url),
          review_attachments (*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setReview(data as any);

      // 조회수 증가 (선택사항)
      // await supabase.rpc('increment_view_count', { row_id: id });
    } catch (error) {
      console.error("Error fetching review:", error);
      alert("게시글을 불러오는데 실패했습니다.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("review_comments")
        .select(`
          *,
          profiles:user_id (display_name, avatar_url)
        `)
        .eq("review_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data as any || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (!newComment.trim()) return;

    setCommentSubmitting(true);
    try {
      const { error } = await supabase
        .from("review_comments")
        .insert({
          review_id: id,
          user_id: user.id,
          content: newComment
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
      minute: "2-digit"
    });
  };

  if (loading) {
    return <div className="min-h-screen p-8 text-center text-gray-500">로딩 중...</div>;
  }

  if (!review) return null;

  return (
    <main className="min-h-screen p-8 max-w-[1600px] mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center text-gray-400 hover:text-white transition-colors mb-8 group"
      >
        <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
        뒤로 가기
      </button>

      {/* Header */}
      <header className="mb-8 border-b border-white/10 pb-8">
        <h1 className="text-3xl font-bold text-white mb-4">{review.title}</h1>
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
          <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold shrink-0 overflow-hidden">
            {user?.user_metadata?.avatar_url ? (
               <img src={user.user_metadata.avatar_url} alt="Me" className="w-full h-full object-cover" />
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
            <div className="text-center py-8 text-gray-500">
              첫 번째 댓글을 남겨보세요!
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
                  {comment.profiles?.avatar_url ? (
                    <img src={comment.profiles.avatar_url} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    comment.profiles?.display_name?.[0] || "?"
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-200">
                      {comment.profiles?.display_name || "알 수 없음"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(comment.created_at)}
                    </span>
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
