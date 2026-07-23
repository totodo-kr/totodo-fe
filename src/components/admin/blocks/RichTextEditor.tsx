"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ResizableImage } from "@/components/ResizableImage";
import LinkExtension from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import UnderlineExtension from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import clsx from "clsx";
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Image as ImageIcon, Link as LinkIcon,
  Quote, Undo, Redo,
} from "lucide-react";
import { Spinner } from "@/components/admin/atoms";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export default function RichTextEditor({ value, onChange, placeholder = "내용을 입력하세요.", minHeight = 200 }: Props) {
  const { user } = useAuthStore();
  const supabase = useMemo(() => createClient(), []);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isInternalChange = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      ResizableImage,
      LinkExtension.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      UnderlineExtension,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none p-4",
        style: `min-height: ${minHeight}px`,
      },
    },
    onUpdate: ({ editor }) => {
      isInternalChange.current = true;
      onChange(editor.getHTML());
    },
  });

  // 외부에서 value가 바뀔 때 (초기 로드) 에디터 내용 동기화
  useEffect(() => {
    if (!editor) return;
    if (isInternalChange.current) { isInternalChange.current = false; return; }
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  // value가 바뀔 때만 실행
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 첨부 가능합니다.");
      return;
    }
    setIsUploadingImage(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `page-blocks/${user?.id ?? "anonymous"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("totodo_pub_storage").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("totodo_pub_storage").getPublicUrl(path);
      editor?.chain().focus().insertContent({ type: "image", attrs: { src: publicUrl } }).run();
    } catch {
      alert("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  if (!editor) return null;

  return (
    <div
      className="rounded-xl border overflow-hidden flex flex-col"
      style={{ borderColor: "#e6dfd8", background: "#18181b" }}
    >
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-1 p-2 border-b border-white/10 bg-zinc-800/30 sticky top-0 z-10">
        <select
          className="bg-transparent text-sm text-gray-300 border border-white/10 rounded px-2 py-1 mr-2 focus:outline-none"
          onChange={(e) => {
            const v = e.target.value;
            if (v === "paragraph") editor.chain().focus().setParagraph().run();
            else if (v === "h1") editor.chain().focus().toggleHeading({ level: 1 }).run();
            else if (v === "h2") editor.chain().focus().toggleHeading({ level: 2 }).run();
            else if (v === "h3") editor.chain().focus().toggleHeading({ level: 3 }).run();
          }}
        >
          <option value="paragraph">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
        <div className="h-4 w-px bg-white/10 mx-1" />
        <TB onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} icon={<Bold className="w-4 h-4" />} />
        <TB onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} icon={<Italic className="w-4 h-4" />} />
        <TB onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} icon={<Underline className="w-4 h-4" />} />
        <TB onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} icon={<Strikethrough className="w-4 h-4" />} />
        <div className="h-4 w-px bg-white/10 mx-1" />
        <TB onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} icon={<AlignLeft className="w-4 h-4" />} />
        <TB onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} icon={<AlignCenter className="w-4 h-4" />} />
        <TB onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} icon={<AlignRight className="w-4 h-4" />} />
        <TB onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} icon={<AlignJustify className="w-4 h-4" />} />
        <div className="h-4 w-px bg-white/10 mx-1" />
        <TB onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} icon={<List className="w-4 h-4" />} />
        <TB onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} icon={<ListOrdered className="w-4 h-4" />} />
        <div className="h-4 w-px bg-white/10 mx-1" />
        <TB onClick={() => { const url = window.prompt("URL을 입력하세요"); if (url) editor.chain().focus().setLink({ href: url }).run(); }} active={editor.isActive("link")} icon={<LinkIcon className="w-4 h-4" />} />
        <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
        <TB onClick={() => imageInputRef.current?.click()} icon={isUploadingImage ? <Spinner size="sm" color="#9ca3af" /> : <ImageIcon className="w-4 h-4" />} />
        <TB onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} icon={<Quote className="w-4 h-4" />} />
        <div className="h-4 w-px bg-white/10 mx-1" />
        <TB onClick={() => editor.chain().focus().undo().run()} icon={<Undo className="w-4 h-4" />} />
        <TB onClick={() => editor.chain().focus().redo().run()} icon={<Redo className="w-4 h-4" />} />
      </div>
      <EditorContent editor={editor} className="flex-1 overflow-y-auto cursor-text" />
    </div>
  );
}

function TB({ icon, onClick, active }: { icon: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "p-1.5 rounded transition-colors",
        active ? "bg-white/20 text-white" : "text-gray-400 hover:text-white hover:bg-white/10"
      )}
    >
      {icon}
    </button>
  );
}
