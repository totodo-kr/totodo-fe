"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import UnderlineExtension from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import clsx from "clsx";
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Link as LinkIcon,
  Quote, Undo, Redo,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
}

export default function AdminRichTextEditor({
  value,
  onChange,
  placeholder = "내용을 입력하세요.",
  minHeight = 240,
  maxHeight = 480,
}: Props) {
  const isInternalChange = useRef(false);
  const [isFocused, setIsFocused] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      LinkExtension.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      UnderlineExtension,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none px-4 py-3",
        style: `min-height: ${minHeight}px; color: #141413;`,
      },
    },
    onUpdate: ({ editor }) => {
      isInternalChange.current = true;
      onChange(editor.getHTML());
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
  });

  useEffect(() => {
    if (!editor) return;
    if (isInternalChange.current) { isInternalChange.current = false; return; }
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  return (
    <div
      className="rounded-lg border overflow-hidden flex flex-col transition-colors"
      style={{
        borderColor: isFocused ? "#cc785c" : "#e6dfd8",
        background: "#fff",
      }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b"
        style={{ borderColor: "#e6dfd8", background: "#faf9f5" }}
      >
        <select
          className="text-xs rounded px-1.5 py-1 mr-1 focus:outline-none border"
          style={{ borderColor: "#e6dfd8", color: "#252523", background: "#fff" }}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "paragraph") editor.chain().focus().setParagraph().run();
            else if (v === "h1") editor.chain().focus().toggleHeading({ level: 1 }).run();
            else if (v === "h2") editor.chain().focus().toggleHeading({ level: 2 }).run();
            else if (v === "h3") editor.chain().focus().toggleHeading({ level: 3 }).run();
          }}
          value={
            editor.isActive("heading", { level: 1 }) ? "h1"
            : editor.isActive("heading", { level: 2 }) ? "h2"
            : editor.isActive("heading", { level: 3 }) ? "h3"
            : "paragraph"
          }
        >
          <option value="paragraph">본문</option>
          <option value="h1">제목 1</option>
          <option value="h2">제목 2</option>
          <option value="h3">제목 3</option>
        </select>
        <Divider />
        <TB onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} icon={<Bold className="w-3.5 h-3.5" />} title="굵게" />
        <TB onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} icon={<Italic className="w-3.5 h-3.5" />} title="기울임" />
        <TB onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} icon={<Underline className="w-3.5 h-3.5" />} title="밑줄" />
        <TB onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} icon={<Strikethrough className="w-3.5 h-3.5" />} title="취소선" />
        <Divider />
        <TB onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} icon={<AlignLeft className="w-3.5 h-3.5" />} title="왼쪽 정렬" />
        <TB onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} icon={<AlignCenter className="w-3.5 h-3.5" />} title="가운데 정렬" />
        <TB onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} icon={<AlignRight className="w-3.5 h-3.5" />} title="오른쪽 정렬" />
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

      <EditorContent
        editor={editor}
        className="flex-1 cursor-text overflow-y-auto"
        style={{ maxHeight }}
      />
    </div>
  );
}

function Divider() {
  return <div className="h-4 w-px mx-0.5" style={{ background: "#e6dfd8" }} />;
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
        active
          ? "text-[#cc785c] bg-[#fdf5f2]"
          : "text-[#6c6a64] hover:text-[#252523] hover:bg-[#efe9de]"
      )}
    >
      {icon}
    </button>
  );
}
