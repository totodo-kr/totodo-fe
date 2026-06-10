"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, CheckCircle, Youtube, X, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export interface VideoChangeResult {
  video_url: string | null;
  video_storage_path: string | null;
  duration_seconds?: number;
}

interface Props {
  lectureId: string | number;
  sessionId?: number;          // 미지정 시 timestamp 기반 경로 사용
  currentVideoUrl: string | null;
  currentStoragePath: string | null;
  onVideoChange: (result: VideoChangeResult) => Promise<void>;
}

type Tab = "upload" | "url";

function isYouTube(url: string): boolean {
  return url.includes("youtube.com") || url.includes("youtu.be");
}

function extractDuration(src: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const timer = setTimeout(() => resolve(undefined), 5000);
    video.onloadedmetadata = () => {
      clearTimeout(timer);
      const dur = Math.round(video.duration);
      resolve(isFinite(dur) && dur > 0 ? dur : undefined);
    };
    video.onerror = () => { clearTimeout(timer); resolve(undefined); };
    video.src = src;
  });
}

export default function VideoUploader({
  lectureId,
  sessionId,
  currentVideoUrl,
  currentStoragePath,
  onVideoChange,
}: Props) {
  const [tab, setTab] = useState<Tab>(currentVideoUrl && !currentStoragePath ? "url" : "upload");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [urlInput, setUrlInput] = useState(currentVideoUrl ?? "");
  const [applyingUrl, setApplyingUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasVideo = !!currentVideoUrl || !!currentStoragePath;

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setUploadError("동영상 파일만 업로드 가능합니다.");
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      // duration 먼저 추출 (파일 object URL로)
      const objectUrl = URL.createObjectURL(file);
      const durationSeconds = await extractDuration(objectUrl);
      URL.revokeObjectURL(objectUrl);

      const ext = file.name.split(".").pop() ?? "mp4";
      const segment = sessionId ?? `new-${Date.now()}`;
      const path = `lecture-videos/${lectureId}/${segment}/${Date.now()}.${ext}`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("totodo_pub_storage")
        .upload(path, file, { upsert: true });

      if (error) throw error;

      await onVideoChange({ video_url: null, video_storage_path: path, duration_seconds: durationSeconds });
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }, [lectureId, sessionId, onVideoChange]);

  const handleApplyUrl = useCallback(async () => {
    const url = urlInput.trim();
    if (!url) return;
    setApplyingUrl(true);
    setUploadError("");

    let durationSeconds: number | undefined;

    if (isYouTube(url)) {
      // YouTube: 서버 API로 duration 추출
      try {
        const res = await fetch(`/api/youtube-duration?url=${encodeURIComponent(url)}`);
        const json = await res.json();
        if (res.ok && typeof json.duration_seconds === "number") {
          durationSeconds = json.duration_seconds;
        } else {
          setUploadError(`길이 자동 추출 실패: ${json.error ?? "알 수 없는 오류"} — 길이를 직접 입력해 주세요.`);
        }
      } catch {
        setUploadError("YouTube 영상 길이 자동 추출 실패 — 길이를 직접 입력해 주세요.");
      }
    } else {
      durationSeconds = await extractDuration(url);
    }

    try {
      await onVideoChange({ video_url: url, video_storage_path: null, duration_seconds: durationSeconds });
    } catch {
      if (!uploadError) setUploadError("URL 적용 중 오류가 발생했습니다.");
    } finally {
      setApplyingUrl(false);
    }
  }, [urlInput, onVideoChange, uploadError]);

  const handleRemove = useCallback(async () => {
    if (!confirm("동영상을 제거하시겠습니까?")) return;
    await onVideoChange({ video_url: null, video_storage_path: null });
    setUrlInput("");
  }, [onVideoChange]);

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "#e6dfd8" }}>
      {/* 현재 상태 바 */}
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ background: "#f5f2ed" }}
      >
        <div className="flex items-center gap-1.5">
          {hasVideo ? (
            <>
              <CheckCircle className="w-3.5 h-3.5" style={{ color: "#5db872" }} />
              <span className="text-xs font-medium" style={{ color: "#5db872" }}>동영상 있음</span>
              {currentVideoUrl && isYouTube(currentVideoUrl) && (
                <Youtube className="w-3.5 h-3.5" style={{ color: "#cc0000" }} />
              )}
            </>
          ) : (
            <>
              <div className="w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: "#b0aca4" }} />
              <span className="text-xs" style={{ color: "#8e8b82" }}>동영상 없음</span>
            </>
          )}
        </div>
        {hasVideo && (
          <button
            onClick={handleRemove}
            title="동영상 제거"
            className="p-0.5 rounded transition-colors hover:bg-[#efe9de]"
          >
            <X className="w-3 h-3" style={{ color: "#8e8b82" }} />
          </button>
        )}
      </div>

      {/* 탭 */}
      <div className="flex border-b" style={{ borderColor: "#e6dfd8" }}>
        {(["upload", "url"] as Tab[]).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 py-1.5 text-xs font-medium transition-colors"
            style={
              tab === key
                ? { color: "#cc785c", borderBottom: "2px solid #cc785c", background: "#fff" }
                : { color: "#8e8b82", background: "#faf9f5" }
            }
          >
            {key === "upload" ? "파일 업로드" : "URL 입력"}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      <div className="px-3 py-2.5" style={{ background: "#fff" }}>
        {tab === "upload" ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {uploading ? (
              <div className="flex items-center gap-2 py-1">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: "#cc785c" }} />
                <span className="text-xs" style={{ color: "#6c6a64" }}>업로드 중… 다른 작업을 계속하셔도 됩니다.</span>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-dashed text-xs transition-colors hover:border-[#cc785c] hover:text-[#cc785c]"
                style={{ borderColor: "#d0c9c0", color: "#8e8b82" }}
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                동영상 파일 선택 (mp4, mov 등) — 업로드 시 길이 자동 추출
              </button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              {urlInput && isYouTube(urlInput) && (
                <Youtube
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                  style={{ color: "#cc0000" }}
                />
              )}
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleApplyUrl(); }}
                placeholder="https://youtube.com/... 또는 직접 영상 URL"
                className="w-full text-xs px-3 py-1.5 rounded-lg border outline-none"
                style={{
                  borderColor: "#e6dfd8",
                  background: "#faf9f5",
                  color: "#141413",
                  paddingLeft: urlInput && isYouTube(urlInput) ? "1.75rem" : undefined,
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
              />
            </div>
            <button
              onClick={handleApplyUrl}
              disabled={!urlInput.trim() || applyingUrl}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 flex items-center"
              style={{ background: "#cc785c", color: "#fff" }}
              onMouseEnter={(e) => { if (!applyingUrl && urlInput.trim()) (e.currentTarget as HTMLButtonElement).style.background = "#a9583e"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#cc785c"; }}
            >
              {applyingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "적용"}
            </button>
          </div>
        )}

        {uploadError && (
          <p className="mt-1.5 text-xs" style={{ color: "#c64545" }}>{uploadError}</p>
        )}
      </div>
    </div>
  );
}
