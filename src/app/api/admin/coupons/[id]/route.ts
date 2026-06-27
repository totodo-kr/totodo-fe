import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

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

  return profile?.role === "admin" ? { user, admin } : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdmin();
    if (!ctx) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id } = await params;
    const { admin } = ctx;
    const body = await req.json();

    const allowed = [
      "name", "description", "discount_value", "max_discount_amount",
      "min_order_amount", "max_issue_count", "valid_from", "valid_until", "is_active",
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "수정할 항목이 없습니다." }, { status: 400 });
    }

    const { data: coupon, error } = await admin
      .from("coupons")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Coupon update error:", error);
      return NextResponse.json({ error: "쿠폰 수정에 실패했습니다." }, { status: 500 });
    }
    if (!coupon) {
      return NextResponse.json({ error: "쿠폰을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ coupon });
  } catch (err) {
    console.error("Admin coupon PATCH unexpected error:", err);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdmin();
    if (!ctx) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id } = await params;
    const { admin } = ctx;

    const { data: coupon, error } = await admin
      .from("coupons")
      .update({ is_active: false })
      .eq("id", id)
      .select("id")
      .single();

    if (error || !coupon) {
      return NextResponse.json({ error: "쿠폰을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin coupon DELETE unexpected error:", err);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
