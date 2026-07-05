// 어드민 전용: digital_download 상품의 원본 파일을 비공개 Storage 버킷("ebook_files")에
// 올리기 위한 signed upload URL 발급. 실제 파일 바이트는 브라우저 → Supabase Storage로
// 직접 전송되므로(uploadToSignedUrl) Next.js 서버 라우트의 요청 바디 크기 제한을 타지 않는다.
//
// 사전 조건: Supabase 대시보드에서 "ebook_files" 버킷을 private으로 생성해 둘 것.
// 이 버킷은 storage.objects RLS 정책이 전혀 없어도 된다 — 업로드(signed upload token)와
// 다운로드(download/[token]/route.ts의 createSignedUrl) 모두 service_role 경유로만 이루어진다.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import crypto from "crypto";

const EBOOK_BUCKET = "ebook_files";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? { admin } : null;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAdmin();
    if (!ctx) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { productId, fileName } = await req.json();
    if (!productId || !fileName) {
      return NextResponse.json({ error: "필수 파라미터가 누락되었습니다." }, { status: 400 });
    }

    const { admin } = ctx;
    const path = `${productId}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;

    const { data, error } = await admin.storage.from(EBOOK_BUCKET).createSignedUploadUrl(path);

    if (error || !data) {
      console.error("createSignedUploadUrl error:", error);
      return NextResponse.json({ error: "업로드 URL 생성에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ path: data.path, token: data.token });
  } catch (err) {
    console.error("Ebook upload-url unexpected error:", err);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
