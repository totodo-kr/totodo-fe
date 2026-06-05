"use client";

import { useRef, useState, useMemo } from "react";
import Image from "next/image";
import { Upload, X, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import type { ImageBlockData } from "@/types/blocks";

interface Props {
  data: ImageBlockData;
  onChange: (data: ImageBlockData) => void;
}

export default function ImageBlockEditor({ data, onChange }: Props) {
  const { user } = useAuthStore();
  const supabase = useMemo(() => createClient(), []);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드 가능합니다.");
      return;
    }
    setUploading(true);
    try {
      // 기존 이미지가 있으면 즉시 삭제
      if (data.storagePath) {
        await supabase.storage.from("totodo_pub_storage").remove([data.storagePath]);
      }
      const ext = file.name.split(".").pop();
      const path = `page-blocks/${user?.id ?? "anonymous"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("totodo_pub_storage").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("totodo_pub_storage").getPublicUrl(path);
      onChange({ ...data, src: publicUrl, storagePath: path });
    } catch {
      alert("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("이미지를 삭제하시겠습니까?")) return;
    if (data.storagePath) {
      await supabase.storage.from("totodo_pub_storage").remove([data.storagePath]);
    }
    onChange({ ...data, src: "", storagePath: undefined });
  };

  const field = (label: string, value: string, key: keyof ImageBlockData, placeholder?: string) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" style={{ color: "#141413" }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange({ ...data, [key]: e.target.value })}
        placeholder={placeholder}
        className="w-full h-10 rounded-lg px-3 text-sm outline-none border transition-colors"
        style={{ background: "#efe9de", borderColor: "#e6dfd8", color: "#141413" }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* 이미지 업로드 영역 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "#141413" }}>이미지</label>
        {data.src ? (
          <div className="relative rounded-lg overflow-hidden border" style={{ borderColor: "#e6dfd8" }}>
            <Image
              src={data.src}
              alt={data.alt || "preview"}
              width={0}
              height={0}
              sizes="100vw"
              className="w-full h-auto max-h-64 object-contain bg-[#efe9de]"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
              style={{ background: "#cc785c" }}
            >
              교체
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center justify-center gap-2 w-full h-40 rounded-lg border-2 border-dashed transition-colors"
            style={{ borderColor: "#e6dfd8", color: "#8e8b82" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#cc785c"; (e.currentTarget as HTMLButtonElement).style.color = "#cc785c"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e6dfd8"; (e.currentTarget as HTMLButtonElement).style.color = "#8e8b82"; }}
          >
            {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
            <span className="text-sm">{uploading ? "업로드 중..." : "클릭하여 이미지 업로드"}</span>
          </button>
        )}
        <input type="file" ref={inputRef} onChange={handleFile} accept="image/*" className="hidden" />
      </div>

      {field("대체 텍스트 (alt)", data.alt, "alt", "이미지 설명")}
      {field("캡션 (선택)", data.caption ?? "", "caption", "이미지 아래 표시될 설명")}
      {field("링크 URL (선택)", data.href ?? "", "href", "https://...")}

      {/* 너비 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "#141413" }}>너비</label>
        <div className="flex gap-2">
          {[25, 50, 75, 100].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => onChange({ ...data, maxWidth: w })}
              className="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
              style={{
                borderColor: (data.maxWidth ?? 100) === w ? "#cc785c" : "#e6dfd8",
                background: (data.maxWidth ?? 100) === w ? "#cc785c" : "transparent",
                color: (data.maxWidth ?? 100) === w ? "#fff" : "#6c6a64",
              }}
            >
              {w}%
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
