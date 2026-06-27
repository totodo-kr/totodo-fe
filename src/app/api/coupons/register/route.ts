import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code?.trim()) {
      return NextResponse.json({ error: "쿠폰 코드를 입력해주세요." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: coupon } = await admin
      .from("coupons")
      .select("id, name, is_active, valid_from, valid_until, max_issue_count, issued_count, issue_method")
      .eq("code", code.trim().toUpperCase())
      .single();

    if (!coupon) {
      return NextResponse.json({ error: "존재하지 않는 쿠폰 코드입니다." }, { status: 404 });
    }
    if (!coupon.is_active) {
      return NextResponse.json({ error: "사용할 수 없는 쿠폰입니다." }, { status: 400 });
    }
    if (coupon.issue_method !== "code") {
      return NextResponse.json({ error: "코드로 등록할 수 없는 쿠폰입니다." }, { status: 400 });
    }

    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return NextResponse.json({ error: "아직 사용 기간이 아닙니다." }, { status: 400 });
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return NextResponse.json({ error: "만료된 쿠폰입니다." }, { status: 400 });
    }
    if (coupon.max_issue_count !== null && coupon.issued_count >= coupon.max_issue_count) {
      return NextResponse.json({ error: "발급 한도가 초과된 쿠폰입니다." }, { status: 400 });
    }

    const { data: userCoupon, error: insertError } = await admin
      .from("user_coupons")
      .insert({
        user_id: user.id,
        coupon_id: coupon.id,
        issue_epoch: "once",
        issue_method: "code",
        status: "active",
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "이미 등록한 쿠폰입니다." }, { status: 409 });
      }
      console.error("user_coupons insert error:", insertError);
      return NextResponse.json({ error: "쿠폰 등록에 실패했습니다." }, { status: 500 });
    }

    await admin
      .from("coupons")
      .update({ issued_count: coupon.issued_count + 1 })
      .eq("id", coupon.id);

    return NextResponse.json({ user_coupon: userCoupon });
  } catch (err) {
    console.error("Coupon register unexpected error:", err);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
