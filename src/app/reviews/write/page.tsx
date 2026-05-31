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
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
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

export default function WriteReviewPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<{ url: string; name: string; size: number; type: string }[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      ResizableImage,
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
      const fileName = `review-images/${user?.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("totodo_pub_storage")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("totodo_pub_storage")
        .getPublicUrl(fileName);

      editor?.chain().focus().insertContent({ type: "image", attrs: { src: publicUrl } }).run();
      setUploadedImages((prev) => [...prev, { url: publicUrl, name: file.name, size: file.size, type: file.type }]);
    } catch (error) {
      console.error(error);
      alert("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploadingImage(false);
    }
  };

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
      // 1. Create Review
      const { data: reviewData, error: reviewError } = await supabase
        .from("reviews")
        .insert({
          user_id: user.id,
          title: title,
          content: editor.getHTML(),
          board_type: "review",
        })
        .select()
        .single();

      if (reviewError) throw reviewError;

      if (uploadedImages.length > 0 && reviewData) {
        await supabase.from("review_attachments").insert(
          uploadedImages.map((img) => ({
            review_id: reviewData.id,
            file_url: img.url,
            file_name: img.name,
            file_size: img.size,
            file_type: img.type,
          }))
        );
      }

      alert("게시글이 등록되었습니다.");
      router.push("/reviews");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("게시글 등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!editor) {
    return null;
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
        <h1 className="text-3xl font-bold">게시글 작성</h1>
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
              <input
                type="file"
                ref={imageInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <ToolbarButton
                onClick={() => imageInputRef.current?.click()}
                icon={isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
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
            {isSubmitting ? "등록 중..." : "등록하기"}
          </button>
        </div>
      </div>
    </main>
  );
}

function ToolbarButton({ icon, onClick, isActive }: { icon: React.ReactNode, onClick?: () => void, isActive?: boolean }) {
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
