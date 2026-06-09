import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(req: NextRequest) {
  // 유저 인증
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { enrollmentId } = await req.json();
  if (!enrollmentId) {
    return NextResponse.json({ error: "수강 ID가 필요합니다." }, { status: 400 });
  }

  const admin = createAdminClient();

  // 해당 수강이 요청 유저 본인 것인지 확인
  const { data: enrollment, error: enrollError } = await admin
    .from("lecture_enrollments")
    .select("id, user_id, status")
    .eq("id", enrollmentId)
    .single();

  if (enrollError || !enrollment) {
    return NextResponse.json({ error: "존재하지 않는 수강 내역입니다." }, { status: 404 });
  }
  if (enrollment.user_id !== user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  if (enrollment.status !== "active") {
    return NextResponse.json({ error: "이미 취소된 수강입니다." }, { status: 409 });
  }

  const { error } = await admin
    .from("lecture_enrollments")
    .update({ status: "cancelled" })
    .eq("id", enrollmentId);

  if (error) {
    return NextResponse.json({ error: "수강 취소에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
