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
import { Spinner } from "@/components/admin/atoms";
import { useRouter, useParams } from "next/navigation";
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
import { useProfile } from "@/hooks/useProfile";
import PageLoading from "@/components/PageLoading";
import clsx from "clsx";

export default function AdminFAQEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuthStore();
  const { profile, loading: profileLoading } = useProfile(user);
  const supabase = useMemo(() => createClient(), []);

  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const hasFetched = useRef(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (profileLoading) return;
    if (!user) {
      alert("로그인이 필요합니다.");
      router.push("/admin/faq");
    }
  }, [profileLoading, router, user]);

  useEffect(() => {
    if (profileLoading || !profile || !user) return;
    if (!isAdmin) {
      alert("관리자만 접근 가능합니다.");
      router.push("/admin/faq");
    }
  }, [isAdmin, profile, profileLoading, router, user]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      ResizableImage,
      LinkExtension.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      UnderlineExtension,
      Placeholder.configure({ placeholder: "내용을 입력하세요." }),
    ],
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[400px] p-4",
      },
    },
  });

  useEffect(() => {
    if (!editor || !isAdmin || hasFetched.current) return;
    hasFetched.current = true;

    const fetchFaq = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("faq")
          .select("title, content")
          .eq("id", id)
          .single();

        if (error) throw error;
        if (!data) {
          alert("게시글을 찾을 수 없습니다.");
          router.back();
          return;
        }

        setTitle(data.title);
        editor.commands.setContent(data.content || "");
      } catch (error) {
        console.error("Error fetching FAQ:", error);
        alert("게시글을 불러오는데 실패했습니다.");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchFaq();
  }, [editor, id, isAdmin, router, supabase]);

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
      const fileExt = file.name.split(".").pop();
      const fileName = `faq-images/${user?.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("totodo_pub_storage")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("totodo_pub_storage").getPublicUrl(fileName);

      editor?.chain().focus().insertContent({ type: "image", attrs: { src: publicUrl } }).run();
    } catch (error) {
      console.error(error);
      alert("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !isAdmin) {
      alert("권한이 없습니다.");
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

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("faq")
        .update({ title, content: editor.getHTML() })
        .eq("id", id);

      if (error) throw error;

      alert("게시글이 수정되었습니다.");
      router.push("/admin/faq");
      router.refresh();
    } catch (error) {
      console.error("Error updating FAQ:", error);
      alert("수정 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (profileLoading || loading) return <PageLoading />;
  if (!user || !isAdmin) return null;
  if (!editor) return null;

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push("/admin/faq")}
          className="flex items-center gap-1 text-sm mb-4 transition-colors"
          style={{ color: "#6c6a64" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#141413")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#6c6a64")}
        >
          <ChevronLeft className="w-4 h-4" />
          목록으로
        </button>
        <h1 className="text-2xl font-semibold" style={{ color: "#141413" }}>
          FAQ 수정
        </h1>
        <p className="text-sm mt-1" style={{ color: "#6c6a64" }}>
          FAQ 내용을 수정합니다.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Title Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: "#141413" }}>
            제목
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력해주세요."
            className="w-full h-11 rounded-lg px-4 text-sm outline-none border transition-colors"
            style={{ background: "#efe9de", borderColor: "#e6dfd8", color: "#141413" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#cc785c")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#e6dfd8")}
          />
        </div>

        {/* Editor Area */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: "#141413" }}>
            내용
          </label>
          <div
            className="rounded-xl border overflow-hidden flex flex-col min-h-[500px]"
            style={{ borderColor: "#e6dfd8", background: "#18181b" }}
          >
            {/* Toolbar */}
            <div className="flex items-center flex-wrap gap-1 p-2 border-b border-white/10 bg-zinc-800/30 sticky top-0 z-10">
              <select
                className="bg-transparent text-sm text-gray-300 border border-white/10 rounded px-2 py-1 mr-2 focus:outline-none"
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
              <input
                type="file"
                ref={imageInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <ToolbarButton
                onClick={() => imageInputRef.current?.click()}
                icon={
                  isUploadingImage ? (
                    <Spinner size="sm" color="#9ca3af" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )
                }
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive("blockquote")}
                icon={<Quote className="w-4 h-4" />}
              />

              <div className="h-4 w-px bg-white/10 mx-1" />

              <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                icon={<Undo className="w-4 h-4" />}
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                icon={<Redo className="w-4 h-4" />}
              />
            </div>

            <EditorContent editor={editor} className="flex-1 overflow-y-auto cursor-text" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-8">
          <button
            onClick={() => router.push("/admin/faq")}
            className="px-5 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{ borderColor: "#e6dfd8", color: "#6c6a64", background: "transparent" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#efe9de")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: "#cc785c" }}
            onMouseEnter={(e) => {
              if (!submitting) (e.currentTarget as HTMLButtonElement).style.background = "#a9583e";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#cc785c";
            }}
          >
            {submitting ? "수정 중..." : "수정하기"}
          </button>
        </div>
      </div>
    </div>
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
