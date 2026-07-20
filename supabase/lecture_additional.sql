-- =============================================
-- 강의 평가 관련 테이블 (리뷰·프로모션·미션)
-- 사전 조건: common.sql, academy.sql
-- =============================================

-- =============================================
-- 강의 리뷰 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS lecture_reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content    TEXT,
  is_hidden  BOOLEAN NOT NULL DEFAULT false,
  is_pinned  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT lecture_reviews_unique_user UNIQUE (lecture_id, user_id)
);

CREATE TRIGGER set_lecture_reviews_updated_at
  BEFORE UPDATE ON lecture_reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE lecture_reviews ENABLE ROW LEVEL SECURITY;

-- 숨김 제외 전체 공개 / 본인 것은 숨김도 조회 가능
CREATE POLICY "lecture_reviews_select_public"
  ON lecture_reviews FOR SELECT
  USING (is_hidden = false OR user_id = auth.uid());

-- 수강자만 작성
CREATE POLICY "lecture_reviews_insert_enrolled"
  ON lecture_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM lecture_enrollments
      WHERE lecture_enrollments.lecture_id = lecture_reviews.lecture_id
        AND lecture_enrollments.user_id = auth.uid()
    )
  );

CREATE POLICY "lecture_reviews_update_own"   ON lecture_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "lecture_reviews_select_admin" ON lecture_reviews FOR SELECT USING (public.is_admin());
CREATE POLICY "lecture_reviews_update_admin" ON lecture_reviews FOR UPDATE USING (public.is_admin());
CREATE POLICY "lecture_reviews_delete_admin" ON lecture_reviews FOR DELETE USING (public.is_admin());

-- =============================================
-- 강의 가격 프로모션 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS lecture_promotions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  price      INTEGER NOT NULL CHECK (price >= 0),
  start_at   TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at     TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_lecture_promotions_updated_at
  BEFORE UPDATE ON lecture_promotions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE lecture_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lecture_promotions_select_public" ON lecture_promotions FOR SELECT USING (true);
CREATE POLICY "lecture_promotions_insert_admin"  ON lecture_promotions FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "lecture_promotions_update_admin"  ON lecture_promotions FOR UPDATE USING (public.is_admin());
CREATE POLICY "lecture_promotions_delete_admin"  ON lecture_promotions FOR DELETE USING (public.is_admin());

-- =============================================
-- 강의 미션(과제) 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS lecture_missions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id  INTEGER NOT NULL REFERENCES lecture_chapters(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  due_date    TIMESTAMP WITH TIME ZONE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_lecture_missions_updated_at
  BEFORE UPDATE ON lecture_missions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE lecture_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lecture_missions_select_public" ON lecture_missions FOR SELECT USING (true);
CREATE POLICY "lecture_missions_insert_admin"  ON lecture_missions FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "lecture_missions_update_admin"  ON lecture_missions FOR UPDATE USING (public.is_admin());
CREATE POLICY "lecture_missions_delete_admin"  ON lecture_missions FOR DELETE USING (public.is_admin());

-- =============================================
-- 미션 제출 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS lecture_mission_submissions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES lecture_missions(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT,
  file_url   TEXT,
  status     TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'passed')),
  feedback   TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT lecture_mission_submissions_unique_user UNIQUE (mission_id, user_id)
);

CREATE TRIGGER set_lecture_mission_submissions_updated_at
  BEFORE UPDATE ON lecture_mission_submissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE lecture_mission_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lecture_mission_submissions_select_own"
  ON lecture_mission_submissions FOR SELECT USING (auth.uid() = user_id);

-- 수강자만 제출 (미션 챕터 → 강의 확인)
CREATE POLICY "lecture_mission_submissions_insert_enrolled"
  ON lecture_mission_submissions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1
      FROM lecture_missions m
      JOIN lecture_chapters c ON c.id = m.chapter_id
      JOIN lecture_enrollments e ON e.lecture_id = c.lecture_id
      WHERE m.id = lecture_mission_submissions.mission_id
        AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "lecture_mission_submissions_update_own"    ON lecture_mission_submissions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "lecture_mission_submissions_select_admin"  ON lecture_mission_submissions FOR SELECT USING (public.is_admin());
CREATE POLICY "lecture_mission_submissions_update_admin"  ON lecture_mission_submissions FOR UPDATE USING (public.is_admin());
CREATE POLICY "lecture_mission_submissions_delete_admin"  ON lecture_mission_submissions FOR DELETE USING (public.is_admin());

-- =============================================
-- 26.07.20
-- 마이그레이션: 유저당 리뷰 1개 제약 제거
-- (이미 운영 중인 DB에 실행)
-- 커뮤니티 게시글을 강의 리뷰로 마이그레이션하면 한 유저가 여러 건을
-- 가질 수 있어 UNIQUE(lecture_id, user_id) 제약을 DB에서 제거한다.
-- 신규 작성 시 유저당 1개 제한은 앱 레벨(useMyLectureReview)에서 강제한다.
-- =============================================
ALTER TABLE lecture_reviews DROP CONSTRAINT IF EXISTS lecture_reviews_unique_user;
