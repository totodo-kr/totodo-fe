"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import UnderlineExtension from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import clsx from "clsx";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Quote,
  Undo,
  Redo,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export default function RichTextEditor({ value, onChange, placeholder = "내용을 입력하세요.", minHeight = 120 }: Props) {
  const isInternalChange = useRef(false);
  const [isFocused, setIsFocused] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      LinkExtension.configure({ openOnClick: false }),
      UnderlineExtension,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-sm max-w-none focus:outline-none px-4 py-3 text-gray-200",
        style: `min-height: ${minHeight}px;`,
      },
    },
    onUpdate: ({ editor }) => {
      isInternalChange.current = true;
      onChange(editor.isEmpty ? "" : editor.getHTML());
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
  });

  useEffect(() => {
    if (!editor) return;
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  return (
    <div
      className={clsx(
        "rounded-lg border overflow-hidden flex flex-col bg-zinc-800 transition-colors",
        isFocused ? "border-brand-500" : "border-white/10"
      )}
    >
      <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-white/10 bg-zinc-900/60">
        <TB onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} icon={<Bold className="w-3.5 h-3.5" />} title="굵게" />
        <TB onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} icon={<Italic className="w-3.5 h-3.5" />} title="기울임" />
        <TB onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} icon={<Underline className="w-3.5 h-3.5" />} title="밑줄" />
        <TB onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} icon={<Strikethrough className="w-3.5 h-3.5" />} title="취소선" />
        <Divider />
        <TB onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} icon={<List className="w-3.5 h-3.5" />} title="글머리 기호" />
        <TB onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} icon={<ListOrdered className="w-3.5 h-3.5" />} title="번호 목록" />
        <TB onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} icon={<Quote className="w-3.5 h-3.5" />} title="인용" />
        <TB
          onClick={() => {
            const url = window.prompt("URL을 입력하세요");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          active={editor.isActive("link")}
          icon={<LinkIcon className="w-3.5 h-3.5" />}
          title="링크"
        />
        <Divider />
        <TB onClick={() => editor.chain().focus().undo().run()} icon={<Undo className="w-3.5 h-3.5" />} title="실행 취소" />
        <TB onClick={() => editor.chain().focus().redo().run()} icon={<Redo className="w-3.5 h-3.5" />} title="다시 실행" />
      </div>

      <EditorContent editor={editor} className="cursor-text" />
    </div>
  );
}

function Divider() {
  return <div className="h-4 w-px mx-0.5 bg-white/10" />;
}

function TB({
  icon,
  onClick,
  active,
  title,
}: {
  icon: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={clsx(
        "p-1.5 rounded transition-colors",
        active ? "text-brand-400 bg-brand-500/10" : "text-gray-400 hover:text-white hover:bg-white/5"
      )}
    >
      {icon}
    </button>
  );
}
