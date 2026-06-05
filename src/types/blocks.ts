export type BlockType = 'text' | 'image' | 'fade_text' | 'video' | 'action_button' | 'grid';

export interface TextBlockData {
  content: string; // TipTap HTML
}

export interface ImageBlockData {
  src: string;
  alt: string;
  caption?: string;
  href?: string;
  storagePath?: string; // Storage 경로 (삭제 시 사용)
  maxWidth?: number; // % 단위, 기본 100
}

export interface FadeTextBlockData {
  content: string; // TipTap HTML
  delay?: number;  // ms, 기본 0
}

export interface VideoBlockData {
  url: string;
  type: 'youtube' | 'file';
  maxWidth?: number; // % 단위, 기본 100
}

export interface ActionButton {
  label: string;
  href: string;
  icon?: 'youtube' | 'instagram' | 'cart' | 'link';
  style: 'primary' | 'secondary' | 'outline';
}

export interface ActionButtonBlockData {
  buttons: ActionButton[];
  align?: 'left' | 'center' | 'right';
}

export type CellBlockType = 'text' | 'image' | 'fade_text' | 'video' | 'action_button';

export type CellBlock =
  | { type: 'text'; data: TextBlockData }
  | { type: 'image'; data: ImageBlockData }
  | { type: 'fade_text'; data: FadeTextBlockData }
  | { type: 'video'; data: VideoBlockData }
  | { type: 'action_button'; data: ActionButtonBlockData };

export interface GridBlockData {
  columns: 2 | 3 | 4;
  cells: CellBlock[];
}

export type BlockData =
  | TextBlockData
  | ImageBlockData
  | FadeTextBlockData
  | VideoBlockData
  | ActionButtonBlockData
  | GridBlockData;

export interface PageBlock {
  id: string;
  page_key: string;
  type: BlockType;
  order_index: number;
  data: BlockData;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  text: '텍스트',
  image: '이미지',
  fade_text: '페이드인 텍스트',
  video: '동영상',
  action_button: '액션 버튼',
  grid: '그리드',
};

export const CELL_TYPE_LABELS: Record<CellBlockType, string> = {
  text: '텍스트',
  image: '이미지',
  fade_text: '페이드인 텍스트',
  video: '동영상',
  action_button: '액션 버튼',
};
