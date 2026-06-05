import Image from "next/image";
import type { ImageBlockData } from "@/types/blocks";

export default function ImageBlock({ data }: { data: ImageBlockData }) {
  const img = (
    <figure className="flex flex-col items-center gap-2 w-full">
      <div className="relative w-full">
        <Image
          src={data.src}
          alt={data.alt}
          width={0}
          height={0}
          sizes="100vw"
          className="w-full h-auto rounded-lg"
        />
      </div>
      {data.caption && (
        <figcaption className="text-sm text-center text-gray-400">{data.caption}</figcaption>
      )}
    </figure>
  );

  if (data.href) {
    return (
      <a href={data.href} target="_blank" rel="noopener noreferrer">
        {img}
      </a>
    );
  }

  return img;
}
