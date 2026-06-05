import type { GridBlockData, CellBlock } from "@/types/blocks";
import TextBlock from "./TextBlock";
import ImageBlock from "./ImageBlock";
import FadeTextBlock from "./FadeTextBlock";
import VideoBlock from "./VideoBlock";
import ActionButtonBlock from "./ActionButtonBlock";

function CellRenderer({ cell }: { cell: CellBlock }) {
  switch (cell.type) {
    case "text":
      return <TextBlock data={cell.data} />;
    case "image":
      return <ImageBlock data={cell.data} />;
    case "fade_text":
      return <FadeTextBlock data={cell.data} />;
    case "video":
      return <VideoBlock data={cell.data} />;
    case "action_button":
      return <ActionButtonBlock data={cell.data} />;
  }
}

const colClass: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

export default function GridBlock({ data }: { data: GridBlockData }) {
  return (
    <div className={`grid gap-6 ${colClass[data.columns] ?? "grid-cols-2"}`}>
      {data.cells.map((cell, i) => (
        <div key={i}>
          <CellRenderer cell={cell} />
        </div>
      ))}
    </div>
  );
}
