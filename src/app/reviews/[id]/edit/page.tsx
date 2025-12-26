"use client";

import {
  ChevronLeft,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Image as ImageIcon,
  Link as LinkIcon,
  Quote,
  Undo,
  Redo,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import UnderlineExtension from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import clsx from "clsx";

export default function EditReviewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuthStore();

  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      ImageExtension,
      LinkExtension.configure({
        openOnClick: false,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      UnderlineExtension,
      Placeholder.configure({
        placeholder: "내용을 입력하세요.",
      }),
    ],
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[400px] p-4",
      },
    },
  });

  const fetchReview = useCallback(async () => {
    if (!id) return;
    if (!user) {
      alert("로그인이 필요합니다.");
      router.push("/reviews");
      return;
    }

    try {
      const { data, error } = await supabase.from("reviews").select("*").eq("id", id).single();
      if (error) throw error;
      if (!data) {
        alert("게시글을 찾을 수 없습니다.");
        router.back();
        return;
      }

      if (data.user_id !== user.id) {
        alert("수정 권한이 없습니다.");
        router.back();
        return;
      }

      setTitle(data.title);
      if (editor) {
        editor.commands.setContent(data.content || "");
      }
    } catch (error) {
      console.error("Error fetching review:", error);
      alert("게시글을 불러오는 중 오류가 발생했습니다.");
      router.back();
    } finally {
      setIsLoading(false);
    }
  }, [editor, id, router, supabase, user]);

  useEffect(() => {
    if (editor) {
      fetchReview();
    }
  }, [editor, fetchReview]);

  const handleSubmit = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }
    if (!editor || editor.isEmpty) {
      alert("내용을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("reviews")
        .update({
          title: title,
          content: editor.getHTML(),
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      alert("게시글이 수정되었습니다.");
      router.push(`/reviews/${id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("게시글 수정 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!editor) {
    return null;
  }

  if (isLoading) {
    return <div className="min-h-screen p-8 text-center text-gray-500">로딩 중...</div>;
  }

  return (
    <main className="min-h-screen bg-black text-white p-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          뒤로가기
        </button>
        <h1 className="text-3xl font-bold">게시글 수정</h1>
      </div>

      <div className="flex flex-col gap-8">
        {/* Title Input */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-lg">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력해주세요."
            className="w-full h-12 bg-zinc-800/50 border border-white/10 rounded-lg px-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Editor Area */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-lg">내용</label>
          <div className="border border-white/10 rounded-lg overflow-hidden bg-zinc-900/30 flex flex-col min-h-[500px]">
            {/* Toolbar */}
            <div className="flex items-center flex-wrap gap-1 p-2 border-b border-white/10 bg-zinc-800/30 sticky top-0 z-10">
              <select
                className="bg-transparent text-sm text-gray-300 border border-white/10 rounded px-2 py-1 mr-2 focus:outline-none focus:border-brand-500"
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "paragraph") editor.chain().focus().setParagraph().run();
                  else if (value === "h1") editor.chain().focus().toggleHeading({ level: 1 }).run();
                  else if (value === "h2") editor.chain().focus().toggleHeading({ level: 2 }).run();
                  else if (value === "h3") editor.chain().focus().toggleHeading({ level: 3 }).run();
                }}
              >
                <option value="paragraph">Paragraph</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
              </select>

              <div className="h-4 w-px bg-white/10 mx-1" />

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive("bold")}
                icon={<Bold className="w-4 h-4" />}
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive("italic")}
                icon={<Italic className="w-4 h-4" />}
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                isActive={editor.isActive("underline")}
                icon={<Underline className="w-4 h-4" />}
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive("strike")}
                icon={<Strikethrough className="w-4 h-4" />}
              />

              <div className="h-4 w-px bg-white/10 mx-1" />

              <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
                isActive={editor.isActive({ textAlign: "left" })}
                icon={<AlignLeft className="w-4 h-4" />}
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign("center").run()}
                isActive={editor.isActive({ textAlign: "center" })}
                icon={<AlignCenter className="w-4 h-4" />}
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign("right").run()}
                isActive={editor.isActive({ textAlign: "right" })}
                icon={<AlignRight className="w-4 h-4" />}
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign("justify").run()}
                isActive={editor.isActive({ textAlign: "justify" })}
                icon={<AlignJustify className="w-4 h-4" />}
              />

              <div className="h-4 w-px bg-white/10 mx-1" />

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive("bulletList")}
                icon={<List className="w-4 h-4" />}
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive("orderedList")}
                icon={<ListOrdered className="w-4 h-4" />}
              />

              <div className="h-4 w-px bg-white/10 mx-1" />

              <ToolbarButton
                onClick={() => {
                  const url = window.prompt("URL을 입력하세요");
                  if (url) editor.chain().focus().setLink({ href: url }).run();
                }}
                isActive={editor.isActive("link")}
                icon={<LinkIcon className="w-4 h-4" />}
              />
              <ToolbarButton
                onClick={() => {
                  const url = window.prompt("이미지 URL을 입력하세요");
                  if (url) editor.chain().focus().setImage({ src: url }).run();
                }}
                icon={<ImageIcon className="w-4 h-4" />}
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive("blockquote")}
                icon={<Quote className="w-4 h-4" />}
              />

              <div className="h-4 w-px bg-white/10 mx-1" />

              <ToolbarButton onClick={() => editor.chain().focus().undo().run()} icon={<Undo className="w-4 h-4" />} />
              <ToolbarButton onClick={() => editor.chain().focus().redo().run()} icon={<Redo className="w-4 h-4" />} />
            </div>

            {/* Editor Content */}
            <EditorContent editor={editor} className="flex-1 overflow-y-auto cursor-text" />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end mt-8 pb-12">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "수정 중..." : "수정하기"}
          </button>
        </div>
      </div>
    </main>
  );
}

function ToolbarButton({
  icon,
  onClick,
  isActive,
}: {
  icon: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "p-1.5 rounded transition-colors",
        isActive ? "bg-white/20 text-white" : "text-gray-400 hover:text-white hover:bg-white/10"
      )}
    >
      {icon}
    </button>
  );
}

