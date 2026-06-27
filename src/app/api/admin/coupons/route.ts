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

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAdmin();
    if (!ctx) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { admin } = ctx;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const filter = searchParams.get("filter") ?? "all";
    const keyword = searchParams.get("keyword")?.trim() ?? "";

    let query = admin.from("coupons").select("*", { count: "exact" });

    if (keyword) {
      query = query.or(`name.ilike.%${keyword}%,code.ilike.%${keyword}%`);
    }

    const now = new Date().toISOString();
    if (filter === "active") {
      query = query.eq("is_active", true).or(`valid_until.is.null,valid_until.gt.${now}`);
    } else if (filter === "inactive") {
      query = query.eq("is_active", false);
    } else if (filter === "expired") {
      query = query.eq("is_active", true).lt("valid_until", now);
    }

    const from = (page - 1) * limit;
    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    if (error) {
      console.error("Admin coupons fetch error:", error);
      return NextResponse.json({ error: "쿠폰 목록 조회에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ coupons: data, total: count ?? 0, page, limit });
  } catch (err) {
    console.error("Admin coupons GET unexpected error:", err);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAdmin();
    if (!ctx) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { user, admin } = ctx;
    const body = await req.json();

    const {
      code, name, description, discount_type, discount_value,
      max_discount_amount, min_order_amount, issue_method,
      issue_epoch_type, max_issue_count, valid_from, valid_until,
    } = body;

    if (!code?.trim() || !name?.trim() || !discount_type || discount_value === undefined) {
      return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
    }

    const { data: coupon, error } = await admin
      .from("coupons")
      .insert({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description?.trim() ?? null,
        discount_type,
        discount_value,
        max_discount_amount: max_discount_amount ?? null,
        min_order_amount: min_order_amount ?? 0,
        issue_method: issue_method ?? "code",
        issue_epoch_type: issue_epoch_type ?? "once",
        max_issue_count: max_issue_count ?? null,
        valid_from: valid_from ?? null,
        valid_until: valid_until ?? null,
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "이미 사용 중인 쿠폰 코드입니다." }, { status: 409 });
      }
      console.error("Coupon create error:", error);
      return NextResponse.json({ error: "쿠폰 생성에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (err) {
    console.error("Admin coupons POST unexpected error:", err);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
