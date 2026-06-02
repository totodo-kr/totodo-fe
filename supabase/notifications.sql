-- 알림 테이블
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  body        text NOT NULL DEFAULT '',
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications (created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 본인 알림만 조회 가능
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- 본인 알림만 수정(읽음 처리) 가능
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- 샘플: 회원가입 알림은 서버(service_role)에서 INSERT
-- INSERT는 service_role 또는 트리거에서만 허용
CREATE POLICY "notifications_insert_service"
  ON notifications FOR INSERT
  WITH CHECK (false); -- 클라이언트에서 직접 INSERT 불가, 트리거/서버에서만


-- =============================================
-- 마이그레이션: 어드민 알림 발송 정책 추가
-- =============================================

-- 기존 INSERT 차단 정책 제거 후 어드민 허용
DROP POLICY IF EXISTS "notifications_insert_service" ON notifications;

CREATE POLICY "notifications_insert_admin"
  ON notifications FOR INSERT
  WITH CHECK (public.is_admin());
