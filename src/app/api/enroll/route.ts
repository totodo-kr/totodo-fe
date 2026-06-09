import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(req: NextRequest) {
  // 1. 유저 인증 확인 (서버 세션)
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { lectureId } = await req.json();
  if (!lectureId) {
    return NextResponse.json({ error: "강의 ID가 필요합니다." }, { status: 400 });
  }

  const admin = createAdminClient();

  // 2. 강의 존재 및 가격 확인
  const { data: lecture, error: lectureError } = await admin
    .from("lectures")
    .select("id, price, is_published")
    .eq("id", lectureId)
    .single();

  if (lectureError || !lecture) {
    return NextResponse.json({ error: "존재하지 않는 강의입니다." }, { status: 404 });
  }
  if (!lecture.is_published) {
    return NextResponse.json({ error: "공개되지 않은 강의입니다." }, { status: 403 });
  }

  // 3. 이미 수강 중인지 확인
  const { data: existing } = await admin
    .from("lecture_enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("lecture_id", lectureId)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "이미 수강 중인 강의입니다." }, { status: 409 });
  }

  // 4. 유료 강의: 결제 완료된 order 확인
  if (lecture.price > 0) {
    const { data: order } = await admin
      .from("orders")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "paid")
      .contains("items", [{ lecture_id: lectureId }])
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: "결제 내역이 확인되지 않습니다." }, { status: 403 });
    }

    const { error } = await admin
      .from("lecture_enrollments")
      .upsert(
        { user_id: user.id, lecture_id: lectureId, order_id: order.id, status: "active" },
        { onConflict: "user_id,lecture_id" }
      );

    if (error) {
      return NextResponse.json({ error: "수강 등록에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  // 5. 무료 강의: 바로 등록 (cancelled 이력이 있어도 upsert로 재활성화)
  const { error } = await admin
    .from("lecture_enrollments")
    .upsert(
      { user_id: user.id, lecture_id: lectureId, status: "active" },
      { onConflict: "user_id,lecture_id" }
    );

  if (error) {
    return NextResponse.json({ error: "수강 등록에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
