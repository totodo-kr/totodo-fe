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
  Plus,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useCallback, useRef } from "react";
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

export default function WriteReviewPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (files.length + newFiles.length > 5) {
        alert("파일은 최대 5개까지 첨부 가능합니다.");
        return;
      }
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
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

      // 2. Upload Files & Create Attachments
      if (files.length > 0 && reviewData) {
        for (const file of files) {
          const fileExt = file.name.split(".").pop();
          const fileName = `${reviewData.id}/${Math.random()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from("review_files")
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from("review_files")
            .getPublicUrl(fileName);

          const { error: attachmentError } = await supabase
            .from("review_attachments")
            .insert({
              review_id: reviewData.id,
              file_url: publicUrl,
              file_name: file.name,
              file_size: file.size,
              file_type: file.type,
            });

          if (attachmentError) throw attachmentError;
        }
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
        {/* Board Select */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-lg">게시판</label>
          <div className="relative">
            <select 
              className="w-full h-12 bg-zinc-800/50 border border-white/10 rounded-lg px-4 text-gray-300 appearance-none focus:outline-none focus:border-brand-500 transition-colors"
              defaultValue="review"
            >
              <option value="review">「오레노 니홍고。」 후기</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
              <ChevronDownIcon />
            </div>
          </div>
        </div>

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

        {/* File Attachment */}
        <div className="flex flex-col gap-4">
          <label className="font-bold text-lg">파일 첨부</label>
          <div className="text-sm text-gray-400">
            파일은 최대 5개까지 첨부 가능하며, 파일 당 최대 50MB까지 첨부할 수 있습니다.
          </div>
          
          <div className="flex flex-col gap-3">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-white/10">
                <span className="text-sm text-gray-300 truncate max-w-[80%]">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                <button 
                  onClick={() => removeFile(index)}
                  className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              multiple 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-brand-500 rounded-lg border border-white/10 transition-colors"
            >
              <Plus className="w-4 h-4" />
              파일 첨부
            </button>
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

function ChevronDownIcon() {
  return (
    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
