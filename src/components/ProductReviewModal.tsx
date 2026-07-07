"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Star, X, ImagePlus, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useMyProductReview } from "@/hooks/useMyProductReview";
import { createClient } from "@/utils/supabase/client";

function StarRating({
  value,
  onChange,
  size = "lg",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "md" | "lg";
}) {
  const [hovered, setHovered] = useState(0);
  const sizeClass = size === "lg" ? "w-8 h-8" : "w-6 h-6";
  const display = hovered || value;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${sizeClass} cursor-pointer transition-colors ${
            n <= display ? "text-yellow-400" : "text-gray-600"
          }`}
          fill={n <= display ? "currentColor" : "none"}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
        />
      ))}
    </div>
  );
}

interface ProductReviewModalProps {
  orderItemId: number;
  productId: number;
  productName: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function ProductReviewModal({
  orderItemId,
  productId,
  productName,
  onClose,
  onSubmitted,
}: ProductReviewModalProps) {
  const { user } = useAuthStore();
  const { myReview, loading, fetchMyReview, submitReview, updateReview } = useMyProductReview(
    orderItemId,
    user?.id
  );

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMyReview();
  }, [fetchMyReview]);

  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setTitle(myReview.title ?? "");
      setContent(myReview.content);
      setImages((myReview.images ?? []).map((img) => img.url));
    }
  }, [myReview]);

  const isEdit = !!myReview;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 첨부 가능합니다.");
      return;
    }
    if (!user) return;

    setUploading(true);
    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `product-reviews/${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("totodo_pub_storage")
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("totodo_pub_storage").getPublicUrl(fileName);

      setImages((prev) => [...prev, publicUrl]);
    } catch (err) {
      console.error(err);
      alert("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (url: string) => {
    setImages((prev) => prev.filter((img) => img !== url));
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("별점을 선택해주세요.");
      return;
    }
    if (!content.trim()) {
      setError("내용을 입력해주세요.");
      return;
    }

    setSubmitting(true);
    setError("");
    const result = isEdit
      ? await updateReview({ rating, title, content, images })
      : await submitReview({ productId, rating, title, content, images });
    setSubmitting(false);

    if (result.ok) {
      onSubmitted();
      onClose();
    } else {
      setError(result.error ?? "리뷰 등록 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-white font-bold text-lg">{isEdit ? "리뷰 수정" : "리뷰 작성"}</h2>
            <p className="text-gray-400 text-sm mt-0.5 truncate">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">
                별점 <span className="text-red-400">*</span>
              </p>
              <StarRating value={rating} onChange={setRating} />
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">제목 (선택)</p>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="리뷰 제목을 입력해주세요."
                className="w-full bg-zinc-800 border border-white/10 rounded-lg p-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">
                내용 <span className="text-red-400">*</span>
              </p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="상품에 대한 솔직한 후기를 남겨주세요."
                rows={5}
                className="w-full bg-zinc-800 border border-white/10 rounded-lg p-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
              />
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-2">사진 (선택)</p>
              <div className="flex flex-wrap gap-2">
                {images.map((url) => (
                  <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                    <Image src={url} alt="리뷰 이미지" fill className="object-cover" />
                    <button
                      onClick={() => handleRemoveImage(url)}
                      className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="w-16 h-16 rounded-lg border border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-white/40 transition-colors">
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  ) : (
                    <ImagePlus className="w-5 h-5 text-gray-500" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
            </div>

            {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
              >
                {submitting ? (isEdit ? "수정 중..." : "등록 중...") : isEdit ? "수정하기" : "등록하기"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
