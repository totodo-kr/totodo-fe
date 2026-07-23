"use client";

import { useRef, useState, useMemo } from "react";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { Spinner } from "@/components/admin/atoms";
import { createClient } from "@/utils/supabase/client";

interface Props {
  /** 현재 이미지 URL */
  value: string;
  /** URL 변경(직접 입력 또는 업로드 완료) 콜백 */
  onChange: (url: string) => void;
  /** 업로드 시 storage 폴더 prefix */
  folder?: string;
  placeholder?: string;
}

const BUCKET = "totodo_pub_storage";

/**
 * URL 직접 입력 + 파일 업로드를 함께 지원하는 이미지 입력 필드.
 * 업로드된 파일은 totodo_pub_storage 버킷의 public URL로 변환되어 onChange로 전달된다.
 */
export default function ImageUploadInput({
  value,
  onChange,
  folder = "uploads",
  placeholder = "https://... (직접 입력하거나 업로드)",
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드 가능합니다.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (upErr) throw upErr;
      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange(publicUrl);
    } catch {
      setError("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm rounded-lg border outline-none transition-colors"
          style={{ background: "#fff", borderColor: "#e6dfd8", color: "#141413" }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
          style={{ background: "#efe9de", color: "#6c6a64" }}
          onMouseEnter={(e) => {
            if (!uploading) (e.currentTarget as HTMLButtonElement).style.background = "#e2d9cc";
          }}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#efe9de")}
        >
          {uploading ? (
            <Spinner size="sm" color="#6c6a64" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {uploading ? "업로드 중" : "업로드"}
        </button>
        <input
          type="file"
          ref={inputRef}
          onChange={handleFile}
          accept="image/*"
          className="hidden"
        />
      </div>

      {error && (
        <p className="text-xs" style={{ color: "#c64545" }}>
          {error}
        </p>
      )}

      {value && (
        <div
          className="relative inline-block rounded-lg overflow-hidden border"
          style={{ borderColor: "#e6dfd8" }}
        >
          <Image
            src={value}
            alt="미리보기"
            width={0}
            height={0}
            sizes="120px"
            className="w-auto h-24 object-contain bg-[#faf9f5]"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            title="이미지 제거"
            className="absolute top-1 right-1 p-1 rounded-full bg-black/55 text-white hover:bg-black/75 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
