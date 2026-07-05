// 기프티콘 코드 최초 열람 기록 엔드포인트.
// revealed_at은 §4 환불 정책의 판단 근거이므로 반드시 서버에서만 기록한다
// (클라이언트가 직접 gifticon_codes를 UPDATE하지 못하도록 RLS도 admin write만 허용).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { gifticon_code_id } = await req.json();

    if (!gifticon_code_id) {
      return NextResponse.json({ error: "필수 파라미터가 누락되었습니다." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: codeRow, error: fetchError } = await admin
      .from("gifticon_codes")
      .select(
        `id, code, status, revealed_at,
         digital_fulfillments!issued_to_fulfillment_id(user_id, status)`
      )
      .eq("id", gifticon_code_id)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fulfillment = (codeRow as any)?.digital_fulfillments;

    if (
      fetchError ||
      !codeRow ||
      !fulfillment ||
      fulfillment.user_id !== user.id ||
      fulfillment.status !== "success"
    ) {
      return NextResponse.json({ error: "조회 권한이 없습니다." }, { status: 403 });
    }

    // 이미 열람한 경우: 재기록 없이 그대로 반환 (최초 1회만 기록)
    if (codeRow.revealed_at) {
      return NextResponse.json({ code: codeRow.code, revealed_at: codeRow.revealed_at });
    }

    const now = new Date().toISOString();
    const { data: updatedRow, error: updateError } = await admin
      .from("gifticon_codes")
      .update({ status: "revealed", revealed_at: now })
      .eq("id", gifticon_code_id)
      .eq("status", "issued")
      .select("code, revealed_at")
      .single();

    if (updateError || !updatedRow) {
      console.error("gifticon reveal update error:", updateError);
      return NextResponse.json({ error: "코드 열람 처리에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ code: updatedRow.code, revealed_at: updatedRow.revealed_at });
  } catch (err) {
    console.error("Gifticon reveal unexpected error:", err);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
