"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { Spinner } from "@/components/admin/atoms";

const CODE_PATTERN = /^\d{4}-\d{4}-\d{4}$/;

interface GifticonStats {
  available: number;
  issued: number;
  revealed: number;
  void: number;
}

interface UploadResult {
  added: number;
  duplicate: number;
  invalid: number;
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-3 rounded-lg text-center" style={{ background: "#faf9f5", border: "1px solid #e6dfd8" }}>
      <p className="text-xl font-bold" style={{ color }}>
        {value}
      </p>
      <p className="text-xs mt-0.5" style={{ color: "#8e8b82" }}>
        {label}
      </p>
    </div>
  );
}

export default function GifticonCodePanel({ productId }: { productId: number }) {
  const [stats, setStats] = useState<GifticonStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [csvText, setCsvText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [invalidLines, setInvalidLines] = useState<string[]>([]);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("gifticon_codes")
      .select("status")
      .eq("product_id", productId);

    const counts: GifticonStats = { available: 0, issued: 0, revealed: 0, void: 0 };
    for (const row of (data ?? []) as { status: string }[]) {
      if (row.status in counts) counts[row.status as keyof GifticonStats]++;
    }
    setStats(counts);
    setLoadingStats(false);
  }, [productId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleUpload = async () => {
    const lines = csvText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const valid: string[] = [];
    const invalid: string[] = [];
    for (const line of lines) {
      (CODE_PATTERN.test(line) ? valid : invalid).push(line);
    }

    setUploading(true);
    setResult(null);
    setInvalidLines(invalid);

    try {
      const supabase = createClient();
      let added = 0;
      let duplicate = 0;

      if (valid.length > 0) {
        const { data: existing } = await supabase
          .from("gifticon_codes")
          .select("code")
          .eq("product_id", productId)
          .in("code", valid);

        const existingSet = new Set((existing ?? []).map((r) => r.code as string));
        const toInsert = valid.filter((c) => !existingSet.has(c));
        duplicate = valid.length - toInsert.length;

        if (toInsert.length > 0) {
          const { error } = await supabase
            .from("gifticon_codes")
            .insert(toInsert.map((code) => ({ product_id: productId, code, status: "available" })));

          if (!error) added = toInsert.length;
        }
      }

      setResult({ added, duplicate, invalid: invalid.length });
      setCsvText("");
      await fetchStats();
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
        기프티콘 코드 관리
      </h2>

      {loadingStats ? (
        <div className="flex justify-center py-6">
          <Spinner size="md" />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3 mb-5">
          <StatBox label="사용 가능" value={stats?.available ?? 0} color="#5db872" />
          <StatBox label="발급됨" value={stats?.issued ?? 0} color="#1565c0" />
          <StatBox label="열람됨" value={stats?.revealed ?? 0} color="#e8a55a" />
          <StatBox label="폐기(void)" value={stats?.void ?? 0} color="#c64545" />
        </div>
      )}

      <label className="block text-sm font-medium mb-1.5" style={{ color: "#252523" }}>
        코드 일괄 등록
      </label>
      <textarea
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
        placeholder={"1111-1111-1111\n2222-2222-2222\n..."}
        rows={6}
        className="w-full px-3 py-2 text-sm rounded-lg border outline-none font-mono"
        style={{ background: "#fff", borderColor: "#e6dfd8", color: "#141413" }}
      />
      <p className="text-xs mt-1.5" style={{ color: "#8e8b82" }}>
        한 줄에 코드 1개씩, 숫자 12자리 4-4-4 대시 형식(예: 1111-1111-1111)으로 입력하세요.
      </p>

      <div className="flex items-center gap-3 mt-3">
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || !csvText.trim()}
          className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          style={{ background: "#cc785c", color: "#fff" }}
        >
          {uploading && <Spinner size="xs" color="#fff" />}
          업로드
        </button>
        {result && (
          <span className="text-xs" style={{ color: "#6c6a64" }}>
            신규 {result.added}개 등록
            {result.duplicate > 0 && ` · 중복 ${result.duplicate}개 건너뜀`}
            {result.invalid > 0 && ` · 형식 오류 ${result.invalid}개`}
          </span>
        )}
      </div>

      {invalidLines.length > 0 && (
        <div className="mt-3 p-3 rounded-lg" style={{ background: "#fdecea" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "#c64545" }}>
            형식이 올바르지 않아 제외된 코드
          </p>
          <p className="text-xs font-mono" style={{ color: "#c64545" }}>
            {invalidLines.join(", ")}
          </p>
        </div>
      )}
    </section>
  );
}
