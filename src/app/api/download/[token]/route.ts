// 전자책 등 digital_download 상품의 보안 다운로드 엔드포인트.
// 파일 원본은 Supabase Storage의 비공개 PRIVATE_BUCKET(totodo_prv_storage) "ebooks/" 폴더에
// 있다고 가정한다 (대시보드에서 버킷을 private으로 생성 — public URL로 노출되면 안 됨).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { PRIVATE_BUCKET } from "@/lib/storage/privateFiles";

const SIGNED_URL_TTL_SECONDS = 300; // 5분

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const admin = createAdminClient();

  // 1. 토큰 소유자 + 이행 상태 확인
  const { data: ebookRow, error: fetchError } = await admin
    .from("ebook_downloads")
    .select(
      `id, download_count, download_limit, expires_at, source_ref,
       digital_fulfillments!inner(user_id, status)`
    )
    .eq("download_token", token)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fulfillment = (ebookRow as any)?.digital_fulfillments;

  if (
    fetchError ||
    !ebookRow ||
    !fulfillment ||
    fulfillment.user_id !== user.id ||
    fulfillment.status !== "success"
  ) {
    return NextResponse.json({ error: "다운로드 권한이 없습니다." }, { status: 403 });
  }

  if (ebookRow.download_count >= ebookRow.download_limit) {
    return NextResponse.json(
      { error: "다운로드 가능 횟수를 초과했습니다." },
      { status: 403 }
    );
  }

  if (ebookRow.expires_at && new Date(ebookRow.expires_at) < new Date()) {
    return NextResponse.json({ error: "다운로드 기한이 만료되었습니다." }, { status: 403 });
  }

  if (!ebookRow.source_ref) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }

  // 2. 원자적 증가 — 조건(한도/만료) 재확인 후 count++ (동시 요청 경쟁 방지)
  const { data: incremented, error: incError } = await admin
    .rpc("increment_ebook_download_count", { p_token: token })
    .single();

  if (incError || !incremented) {
    return NextResponse.json(
      { error: "다운로드 가능 횟수를 초과했거나 만료되었습니다." },
      { status: 403 }
    );
  }

  // 3. Storage signed URL 발급 후 redirect
  const { data: signedUrlData, error: signError } = await admin.storage
    .from(PRIVATE_BUCKET)
    .createSignedUrl(ebookRow.source_ref, SIGNED_URL_TTL_SECONDS);

  if (signError || !signedUrlData) {
    console.error("createSignedUrl error:", signError);
    return NextResponse.json(
      { error: "파일 다운로드 URL 생성에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.redirect(signedUrlData.signedUrl, 302);
}
