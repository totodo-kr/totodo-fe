import type { TextBlockData } from "@/types/blocks";

export default function TextBlock({ data }: { data: TextBlockData }) {
  return (
    <div
      className="prose prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: data.content }}
    />
  );
}
