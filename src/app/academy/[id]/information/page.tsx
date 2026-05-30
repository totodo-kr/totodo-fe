"use client";

import { useParams } from "next/navigation";
import { useLecture } from "@/hooks/useLecture";

export default function InformationPage() {
  const params = useParams();
  const { lecture, loading } = useLecture(params.id);

  if (loading) {
    return <p className="text-gray-500">로딩 중...</p>;
  }

  const paragraphs = lecture?.description?.split("\n\n").filter(Boolean) ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-4">강의 소개</h2>
      <div className="space-y-6 text-gray-300 leading-relaxed">
        {paragraphs.map((block, i) => (
          <div key={i} className="space-y-2">
            {block.split("\n").map((line, j) => (
              <p key={j}>{line}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
