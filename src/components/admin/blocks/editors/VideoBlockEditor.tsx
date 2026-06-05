"use client";

import type { VideoBlockData } from "@/types/blocks";

interface Props {
  data: VideoBlockData;
  onChange: (data: VideoBlockData) => void;
}

export default function VideoBlockEditor({ data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "#141413" }}>동영상 유형</label>
        <div className="flex gap-3">
          {(["youtube", "file"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ ...data, type: t })}
              className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
              style={{
                borderColor: data.type === t ? "#cc785c" : "#e6dfd8",
                background: data.type === t ? "#cc785c" : "transparent",
                color: data.type === t ? "#fff" : "#6c6a64",
              }}
            >
              {t === "youtube" ? "YouTube" : "파일 URL"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "#141413" }}>
          {data.type === "youtube" ? "YouTube URL" : "동영상 파일 URL"}
        </label>
        <input
          type="text"
          value={data.url}
          onChange={(e) => onChange({ ...data, url: e.target.value })}
          placeholder={data.type === "youtube" ? "https://www.youtube.com/watch?v=..." : "https://..."}
          className="w-full h-10 rounded-lg px-3 text-sm outline-none border transition-colors"
          style={{ background: "#efe9de", borderColor: "#e6dfd8", color: "#141413" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
        />
      </div>
    </div>
  );
}
