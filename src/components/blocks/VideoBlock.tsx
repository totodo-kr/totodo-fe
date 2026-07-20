import type { VideoBlockData } from "@/types/blocks";

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

export default function VideoBlock({ data }: { data: VideoBlockData }) {
  const maxW = data.maxWidth ?? 100;

  if (data.type === "youtube") {
    const id = getYouTubeId(data.url);
    if (!id) return null;
    return (
      <div style={{ width: `${maxW}%`, margin: "0 auto" }}>
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            className="absolute inset-0 w-full h-full rounded-lg"
            src={`https://www.youtube.com/embed/${id}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: `${maxW}%`, margin: "0 auto" }}>
      <video src={data.url} controls className="totodo-video-controls w-full rounded-lg" />
    </div>
  );
}
