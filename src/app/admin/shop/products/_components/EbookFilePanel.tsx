"use client";

import { useRef, useState } from "react";
import { FileText, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Spinner } from "@/components/admin/atoms";
import { PRIVATE_BUCKET } from "@/lib/storage/privateFiles";

interface EbookFilePanelProps {
  productId: number;
  filePath: string | null;
  onFilePathChange: (path: string | null) => void;
}

export default function EbookFilePanel({ productId, filePath, onFilePathChange }: EbookFilePanelProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fileName = filePath?.split("/").pop() ?? null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const urlRes = await fetch("/api/admin/ebook/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, fileName: file.name }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) {
        setError(urlData.error ?? "업로드 URL 생성에 실패했습니다.");
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(PRIVATE_BUCKET)
        .uploadToSignedUrl(urlData.path, urlData.token, file);

      if (uploadError) {
        setError("파일 업로드에 실패했습니다.");
        return;
      }

      const previousPath = filePath;
      onFilePathChange(urlData.path);

      if (previousPath) {
        await fetch("/api/admin/ebook/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: previousPath }),
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!filePath) return;
    setUploading(true);
    setError(null);
    try {
      await fetch("/api/admin/ebook/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath }),
      });
      onFilePathChange(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="mb-8 p-6 rounded-xl" style={{ background: "#fff", border: "1px solid #e6dfd8" }}>
      <h2
        className="text-base font-semibold mb-4 pb-2 border-b"
        style={{ color: "#252523", borderColor: "#e6dfd8" }}
      >
        전자책 파일 관리
      </h2>

      {filePath ? (
        <div
          className="flex items-center justify-between gap-3 p-3 rounded-lg mb-3"
          style={{ background: "#faf9f5", border: "1px solid #e6dfd8" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 shrink-0" style={{ color: "#cc785c" }} />
            <span className="text-sm truncate" style={{ color: "#252523" }}>
              {fileName}
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={uploading}
            className="p-1.5 rounded-lg transition-colors disabled:opacity-40 shrink-0"
            style={{ color: "#c64545" }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <p className="text-xs mb-3" style={{ color: "#c64545" }}>
          업로드된 파일이 없습니다 — 이 상태에서는 결제 자체가 재고 부족으로 차단됩니다.
        </p>
      )}

      <input ref={inputRef} type="file" onChange={handleFileSelect} className="hidden" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        style={{ background: "#cc785c", color: "#fff" }}
      >
        {uploading && <Spinner size="xs" color="#fff" />}
        {filePath ? "파일 교체" : "파일 업로드"}
      </button>

      {error && (
        <p className="text-xs mt-2" style={{ color: "#c64545" }}>
          {error}
        </p>
      )}
    </section>
  );
}
