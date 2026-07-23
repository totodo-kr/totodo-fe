// 어드민 전용: 전자책 파일 삭제 (교체 시 이전 파일 정리, 또는 명시적 삭제 버튼).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { PRIVATE_BUCKET } from "@/lib/storage/privateFiles";

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

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAdmin();
    if (!ctx) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { path } = await req.json();
    if (!path) {
      return NextResponse.json({ error: "필수 파라미터가 누락되었습니다." }, { status: 400 });
    }

    const { admin } = ctx;
    const { error } = await admin.storage.from(PRIVATE_BUCKET).remove([path]);

    if (error) {
      console.error("Ebook delete error:", error);
      return NextResponse.json({ error: "파일 삭제에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Ebook delete unexpected error:", err);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
