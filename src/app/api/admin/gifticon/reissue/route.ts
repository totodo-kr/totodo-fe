// 어드민 전용: 이미 발급된 기프티콘 코드를 폐기(void)하고 같은 fulfillment에 새 코드를 재발급.
// claim_gifticon_code RPC는 service_role에게만 EXECUTE 권한이 있어(보안 조치, order.sql 참고)
// 브라우저에서 직접 호출할 수 없다 — 반드시 이 서버 라우트를 거쳐야 한다.

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

  return profile?.role === "admin" ? { admin } : null;
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAdmin();
    if (!ctx) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { gifticon_code_id } = await req.json();
    if (!gifticon_code_id) {
      return NextResponse.json({ error: "필수 파라미터가 누락되었습니다." }, { status: 400 });
    }

    const { admin } = ctx;

    const { data: oldCode } = await admin
      .from("gifticon_codes")
      .select("id, product_id, issued_to_fulfillment_id, status")
      .eq("id", gifticon_code_id)
      .single();

    if (!oldCode || !oldCode.issued_to_fulfillment_id || !["issued", "revealed"].includes(oldCode.status)) {
      return NextResponse.json({ error: "재발급할 수 없는 코드입니다." }, { status: 400 });
    }

    // 기존 코드를 void 처리하기 전에 새 코드부터 확보한다 —
    // 재고가 없어 실패하면 고객이 코드 없이 남는 상황을 방지하기 위함.
    const { data: newCodeId, error: claimError } = await admin.rpc("claim_gifticon_code", {
      p_product_id: oldCode.product_id,
      p_fulfillment_id: oldCode.issued_to_fulfillment_id,
    });

    if (claimError || newCodeId === null) {
      return NextResponse.json({ error: "재고가 없어 재발급할 수 없습니다." }, { status: 400 });
    }

    await admin
      .from("gifticon_codes")
      .update({ status: "void" })
      .eq("id", oldCode.id);

    return NextResponse.json({ success: true, newCodeId });
  } catch (err) {
    console.error("Gifticon reissue unexpected error:", err);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
