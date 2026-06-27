import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id } = await params;
    const { email, issue_epoch: customEpoch } = await req.json();

    if (!email?.trim()) {
      return NextResponse.json({ error: "이메일을 입력해주세요." }, { status: 400 });
    }

    const { data: coupon } = await admin
      .from("coupons")
      .select("id, name, is_active, issue_epoch_type, max_issue_count, issued_count")
      .eq("id", id)
      .single();

    if (!coupon) {
      return NextResponse.json({ error: "쿠폰을 찾을 수 없습니다." }, { status: 404 });
    }
    if (!coupon.is_active) {
      return NextResponse.json({ error: "비활성화된 쿠폰입니다." }, { status: 400 });
    }
    if (coupon.max_issue_count !== null && coupon.issued_count >= coupon.max_issue_count) {
      return NextResponse.json({ error: "발급 한도가 초과된 쿠폰입니다." }, { status: 400 });
    }

    const { data: targetProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email.trim())
      .single();

    if (!targetProfile) {
      return NextResponse.json({ error: "해당 이메일의 유저를 찾을 수 없습니다." }, { status: 404 });
    }

    const now = new Date();
    let issue_epoch: string;
    if (coupon.issue_epoch_type === "once") {
      issue_epoch = "once";
    } else if (coupon.issue_epoch_type === "monthly") {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      issue_epoch = `${y}${m}`;
    } else {
      if (!customEpoch?.trim()) {
        return NextResponse.json({ error: "manual 발급 방식은 issue_epoch를 직접 입력해야 합니다." }, { status: 400 });
      }
      issue_epoch = customEpoch.trim();
    }

    const { data: userCoupon, error: insertError } = await admin
      .from("user_coupons")
      .insert({
        user_id: targetProfile.id,
        coupon_id: coupon.id,
        issue_epoch,
        issue_method: "admin_direct",
        status: "active",
        issued_admin_id: user.id,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "이미 발급된 쿠폰입니다." }, { status: 409 });
      }
      console.error("user_coupons insert error:", insertError);
      return NextResponse.json({ error: "쿠폰 발급에 실패했습니다." }, { status: 500 });
    }

    await Promise.all([
      admin
        .from("coupons")
        .update({ issued_count: coupon.issued_count + 1 })
        .eq("id", coupon.id),
      admin
        .from("notifications")
        .insert({
          user_id: targetProfile.id,
          title: "쿠폰이 도착했어요!",
          body: `${coupon.name} 쿠폰이 발급되었습니다.`,
        }),
    ]);

    return NextResponse.json({ user_coupon: userCoupon }, { status: 201 });
  } catch (err) {
    console.error("Admin coupon issue unexpected error:", err);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
