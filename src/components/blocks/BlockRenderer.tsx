import type { PageBlock } from "@/types/blocks";
import TextBlock from "./TextBlock";
import ImageBlock from "./ImageBlock";
import FadeTextBlock from "./FadeTextBlock";
import VideoBlock from "./VideoBlock";
import ActionButtonBlock from "./ActionButtonBlock";
import GridBlock from "./GridBlock";
import type {
  TextBlockData,
  ImageBlockData,
  FadeTextBlockData,
  VideoBlockData,
  ActionButtonBlockData,
  GridBlockData,
} from "@/types/blocks";

export default function BlockRenderer({ block }: { block: PageBlock }) {
  switch (block.type) {
    case "text":
      return <TextBlock data={block.data as TextBlockData} />;
    case "image":
      return <ImageBlock data={block.data as ImageBlockData} />;
    case "fade_text":
      return <FadeTextBlock data={block.data as FadeTextBlockData} />;
    case "video":
      return <VideoBlock data={block.data as VideoBlockData} />;
    case "action_button":
      return <ActionButtonBlock data={block.data as ActionButtonBlockData} />;
    case "grid":
      return <GridBlock data={block.data as GridBlockData} />;
    default:
      return null;
  }
}
