-- =============================================
-- 2026-05-30 첫 작성
-- =============================================

-- =============================================
-- 강사 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS instructors (
  id         SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bio        TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT instructors_unique_user UNIQUE (user_id)
);

CREATE TRIGGER set_instructors_updated_at
  BEFORE UPDATE ON instructors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- 강의(클래스) 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS lectures (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  subtitle      TEXT,
  description   TEXT,
  instructor_id INTEGER NOT NULL REFERENCES instructors(id) ON DELETE RESTRICT,
  thumbnail_url TEXT,
  price         INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0),
  is_published  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_lectures_updated_at
  BEFORE UPDATE ON lectures
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- 챕터 테이블 (목차 그룹)
-- =============================================
CREATE TABLE IF NOT EXISTS lecture_chapters (
  id          SERIAL PRIMARY KEY,
  lecture_id  INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_lecture_chapters_updated_at
  BEFORE UPDATE ON lecture_chapters
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- 강의 세션(개별 영상) 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS lecture_sessions (
  id               SERIAL PRIMARY KEY,
  chapter_id       INTEGER NOT NULL REFERENCES lecture_chapters(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  video_url        TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  order_index      INTEGER NOT NULL DEFAULT 0,
  is_preview       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_lecture_sessions_updated_at
  BEFORE UPDATE ON lecture_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- 세션 첨부파일 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS lecture_session_attachments (
  id         SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES lecture_sessions(id) ON DELETE CASCADE,
  file_name  TEXT NOT NULL,
  file_url   TEXT NOT NULL,
  file_size  BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 수강 등록 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS lecture_enrollments (
  id          SERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lecture_id  INTEGER NOT NULL REFERENCES lectures(id) ON DELETE RESTRICT,
  order_id    INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'expired', 'cancelled')),
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at  TIMESTAMP WITH TIME ZONE,

  CONSTRAINT lecture_enrollments_unique_user_lecture UNIQUE (user_id, lecture_id)
);

-- =============================================
-- 시청 진도 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS lecture_watch_progress (
  id               SERIAL PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id       INTEGER NOT NULL REFERENCES lecture_sessions(id) ON DELETE CASCADE,
  watched_seconds  INTEGER NOT NULL DEFAULT 0 CHECK (watched_seconds >= 0),
  is_completed     BOOLEAN NOT NULL DEFAULT false,
  last_watched_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT lecture_watch_progress_unique_user_session UNIQUE (user_id, session_id)
);

-- =============================================
-- 강의 북마크 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS lecture_bookmarks (
  id         SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT lecture_bookmarks_unique_user_lecture UNIQUE (user_id, lecture_id)
);

-- =============================================
-- 마호 칼럼 (강사 칼럼 게시글) 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS lecture_board_posts (
  id           SERIAL PRIMARY KEY,
  lecture_id   INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  author_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  title        TEXT NOT NULL,
  content      TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_lecture_board_posts_updated_at
  BEFORE UPDATE ON lecture_board_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- 강의 공지 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS lecture_notices (
  id           SERIAL PRIMARY KEY,
  lecture_id   INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  content      TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_lecture_notices_updated_at
  BEFORE UPDATE ON lecture_notices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- RLS (Row Level Security)
-- =============================================

ALTER TABLE instructors                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_chapters            ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_session_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_enrollments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_watch_progress      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_bookmarks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_board_posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_notices             ENABLE ROW LEVEL SECURITY;

-- 강사/강의/챕터/세션: 공개 읽기
CREATE POLICY "instructors_read_all"               ON instructors                 FOR SELECT USING (true);
CREATE POLICY "lectures_read_published"            ON lectures                    FOR SELECT USING (is_published = true);
CREATE POLICY "lecture_chapters_read_all"           ON lecture_chapters            FOR SELECT USING (true);
CREATE POLICY "lecture_sessions_read_all"          ON lecture_sessions            FOR SELECT USING (true);
CREATE POLICY "lecture_session_attachments_read"   ON lecture_session_attachments FOR SELECT USING (true);
CREATE POLICY "lecture_board_posts_read_published" ON lecture_board_posts         FOR SELECT USING (is_published = true);
CREATE POLICY "lecture_notices_read_published"     ON lecture_notices             FOR SELECT USING (is_published = true);

-- 수강 등록: 본인 것만 조회
-- INSERT는 /api/enroll (service role) 에서만 처리 — 유저 직접 INSERT 정책 없음
CREATE POLICY "lecture_enrollments_read_own"
  ON lecture_enrollments FOR SELECT
  USING (auth.uid() = user_id);

-- 시청 진도: 본인 것만 조회/삽입/수정
CREATE POLICY "lecture_watch_progress_read_own"
  ON lecture_watch_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "lecture_watch_progress_insert_own"
  ON lecture_watch_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lecture_watch_progress_update_own"
  ON lecture_watch_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- 북마크: 본인 것만 조회/추가/삭제
CREATE POLICY "lecture_bookmarks_read_own"
  ON lecture_bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "lecture_bookmarks_insert_own"
  ON lecture_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lecture_bookmarks_delete_own"
  ON lecture_bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- 샘플 데이터
-- ※ instructor user_id는 Supabase 대시보드에서 실제 UUID로 교체 후 실행
-- =============================================

-- 강사
INSERT INTO instructors (id, user_id, bio) VALUES
  (1, '3721abd6-d9a1-4eb5-b7b7-c2ad5e2467d6', '일본어 강사 도도토. 덕질로 일본어를 독학한 경험을 바탕으로 강의합니다.');

-- 강의
INSERT INTO lectures (id, title, subtitle, description, instructor_id, thumbnail_url, price, is_published) VALUES
  (1,
   '오레노 니홍고',
   '덕질로 독학할 수 있게 되는 일본어 강의',
   '국내 유일 덕질로 독학할 수 있게 되는 강의, 오레노 니홍고.
시중에 널려있는 시험점수, 자격증을 위한 강의가 아닙니다.
유튜브에서 유행처럼 지나가는 공부법에 대한 강의가 아닙니다.

인간의 뇌구조가 어떻게 해야 언어를 받아들이는지.
언어를 가장 빠르게 획득할 수 있는 방법이 무엇인지.
일본어 뿐만이 아니라 평생, 다른 분야까지 써먹을 수 있는 내용을 알려드립니다.
왜냐하면, 시대가 지나도 변하지 않는 본질.
그것만이 가치가 있다고 믿으니까요.

단기적인 시험점수를 원하시면 시중의 강의들을 추천드립니다.
하지만 한번 본질을 배워 평생 스스로 물고기를 잡고싶으시다면,
단연컨대 「오레노 니홍고。」 뿐입니다.
강의에서 기다리겠습니다!

* 특별하게 1강을 공개해놓았습니다. 지금 바로 수강해보세요!',
   1,
   'https://images.unsplash.com/photo-1528164344705-47542687000d?q=80&w=2992&auto=format&fit=crop',
   0,
   true);

-- 챕터
INSERT INTO lecture_chapters (id, lecture_id, title, order_index) VALUES
  (1, 1, '第一章) 자신의 길은 자신이 정한다.', 1);

-- 강의 세션 (chapter 1 - 11개)
INSERT INTO lecture_sessions (id, chapter_id, title, duration_seconds, order_index, is_preview) VALUES
  (1,  1, '01. 「오리엔테이션」',                               590,  1, true),
  (2,  1, '02. 「슬픈 좋아하니?」',                            1568,  2, false),
  (3,  1, '03. 「일본어 실력에 늘지 않는 느낌이 든다고?」',     341,  3, false),
  (4,  1, '04. 「MBTI는 E? 아니면 I?」',                        665,  4, false),
  (5,  1, '05. 「그럼, 최고의 인조은 뭐야?」',                  791,  5, false),
  (6,  1, '06. 「일본어의 문자가 많은 이유, 알고 있니?」',      587,  6, false),
  (7,  1, '07. 「도도토류 최고의 단어장。」',                   526,  7, false),
  (8,  1, '08. 「일본어의 ''감자'' 담당 찾자。」',              1415,  8, false),
  (9,  1, '09. 「스스로 해결하지 못하는 사람이라면, ...」',     320,  9, false),
  (10, 1, '10. 「모든을 모르면, 평생 못주고。」',               540, 10, false),
  (11, 1, '11. 「도도토가 선생님? 아니, 다크시。」',            480, 11, false);

-- 첨부파일이 있는 세션 표시 (실제 파일 URL은 추후 업로드 후 채울 것)
-- session_id 6: 「일본어의 문자가 많은 이유, 알고 있니?」
-- session_id 8: 「일본어의 '감자' 담당 찾자。」
-- INSERT INTO lecture_session_attachments (session_id, file_name, file_url) VALUES
--   (6, '문자표.pdf', ''),
--   (8, '단어장.pdf', '');

-- 마호 칼럼
INSERT INTO lecture_board_posts (id, lecture_id, author_id, title, content, is_published, published_at) VALUES
  (1, 1, '3721abd6-d9a1-4eb5-b7b7-c2ad5e2467d6',
   '마호 칼럼 📖🌟 - 제 2관。',
   '내 발음, 괜찮은 거 맞을까?

이 마호 칼럼을 펼쳐봤다면 한국어가 모국어인 한국인으로서, 일본어 발음에 대한 걱정할 일이 사라질 것입니다.

언어에는 /음성학/과 /음운론/이 있습니다.

음성학은 /목표로 하는 상상속의 발음/이고, 음운론은 /실제로 내는 발음/입니다.

예를 들어 우리는 /비빔밥/이 ''ㅂ''을 모두 같은 발음이라고 생각합니다.
하지만 이 3개의 ㅂ은 모두 다른 소리를 냅니다.
실제로 발음할 때는 [bibimpa]이라고 한다는 것이죠.',
   true,
   '2024-07-29 00:00:00+00');

-- 시퀀스 동기화 (명시적 id로 INSERT 후 필수)
SELECT setval('instructors_id_seq',         (SELECT MAX(id) FROM instructors));
SELECT setval('lectures_id_seq',            (SELECT MAX(id) FROM lectures));
SELECT setval('lecture_chapters_id_seq',    (SELECT MAX(id) FROM lecture_chapters));
SELECT setval('lecture_sessions_id_seq',    (SELECT MAX(id) FROM lecture_sessions));
SELECT setval('lecture_board_posts_id_seq', (SELECT MAX(id) FROM lecture_board_posts));

-- =============================================
-- 마이그레이션: chapters → lecture_chapters
-- (이미 운영 중인 DB에 실행)
-- =============================================

-- 1. 테이블 이름 변경 (FK 참조는 PostgreSQL이 자동으로 업데이트)
ALTER TABLE chapters RENAME TO lecture_chapters;

-- 2. 트리거 이름 변경
ALTER TRIGGER set_chapters_updated_at ON lecture_chapters
  RENAME TO set_lecture_chapters_updated_at;

-- 3. RLS 정책 이름 변경
ALTER POLICY "chapters_read_all" ON lecture_chapters
  RENAME TO "lecture_chapters_read_all";

-- =============================================
-- 마이그레이션: chapters → lecture_chapters
-- (이미 운영 중인 DB에 실행)
-- =============================================
-- 1. 테이블 이름 변경 (FK 참조는 PostgreSQL이 자동으로 업데이트)
ALTER TABLE chapters RENAME TO lecture_chapters;

-- 2. 트리거 이름 변경
ALTER TRIGGER set_chapters_updated_at ON lecture_chapters
  RENAME TO set_lecture_chapters_updated_at;

-- 3. RLS 정책 이름 변경
ALTER POLICY "chapters_read_all" ON lecture_chapters
  RENAME TO "lecture_chapters_read_all";
-- =============================================
-- 마이그레이션: 어드민 RLS 정책 추가
-- (이미 운영 중인 DB에 실행)
-- =============================================

-- 어드민은 비공개 강의 포함 전체 읽기 가능
CREATE POLICY "lectures_read_admin"
  ON lectures FOR SELECT
  USING (public.is_admin());

-- 어드민 강의 CRUD
CREATE POLICY "lectures_insert_admin"
  ON lectures FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "lectures_update_admin"
  ON lectures FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "lectures_delete_admin"
  ON lectures FOR DELETE
  USING (public.is_admin());

-- =============================================
-- 마이그레이션: 챕터·세션 어드민 CRUD 권한 추가
-- (이미 운영 중인 DB에 실행)
-- =============================================

-- 챕터: 어드민 전체 접근
CREATE POLICY "lecture_chapters_insert_admin"
  ON lecture_chapters FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "lecture_chapters_update_admin"
  ON lecture_chapters FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "lecture_chapters_delete_admin"
  ON lecture_chapters FOR DELETE
  USING (public.is_admin());

-- 세션: 어드민 전체 접근
CREATE POLICY "lecture_sessions_insert_admin"
  ON lecture_sessions FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "lecture_sessions_update_admin"
  ON lecture_sessions FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "lecture_sessions_delete_admin"
  ON lecture_sessions FOR DELETE
  USING (public.is_admin());

-- =============================================
-- 마이그레이션: 강의 고도화 (2026-06-10)
-- =============================================

-- lecture_sessions: 직접 업로드용 storage path
ALTER TABLE lecture_sessions ADD COLUMN IF NOT EXISTS video_storage_path TEXT;

-- lecture_board_posts: 카테고리 컬럼
ALTER TABLE lecture_board_posts ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '일반';

-- =============================================
-- 강의별 리뷰 테이블
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

-- 숨김 처리된 것 제외 전체 공개 읽기
CREATE POLICY "lecture_reviews_select_public"
  ON lecture_reviews FOR SELECT
  USING (is_hidden = false);

-- 수강자만 작성 (lecture_enrollments 확인)
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

-- 본인 수정
CREATE POLICY "lecture_reviews_update_own"
  ON lecture_reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- 어드민 전체 접근 (숨김 포함)
CREATE POLICY "lecture_reviews_select_admin"
  ON lecture_reviews FOR SELECT
  USING (public.is_admin());

CREATE POLICY "lecture_reviews_update_admin"
  ON lecture_reviews FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "lecture_reviews_delete_admin"
  ON lecture_reviews FOR DELETE
  USING (public.is_admin());

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

CREATE POLICY "lecture_promotions_select_public"
  ON lecture_promotions FOR SELECT
  USING (true);

CREATE POLICY "lecture_promotions_insert_admin"
  ON lecture_promotions FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "lecture_promotions_update_admin"
  ON lecture_promotions FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "lecture_promotions_delete_admin"
  ON lecture_promotions FOR DELETE
  USING (public.is_admin());

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

-- 목록은 공개 (제목·마감일), 상세는 수강자만 → 프론트에서 content 제어
CREATE POLICY "lecture_missions_select_public"
  ON lecture_missions FOR SELECT
  USING (true);

CREATE POLICY "lecture_missions_insert_admin"
  ON lecture_missions FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "lecture_missions_update_admin"
  ON lecture_missions FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "lecture_missions_delete_admin"
  ON lecture_missions FOR DELETE
  USING (public.is_admin());

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

-- 본인 제출만 읽기
CREATE POLICY "lecture_mission_submissions_select_own"
  ON lecture_mission_submissions FOR SELECT
  USING (auth.uid() = user_id);

-- 수강자만 제출 (미션의 챕터 → 강의 확인)
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

-- 본인 수정
CREATE POLICY "lecture_mission_submissions_update_own"
  ON lecture_mission_submissions FOR UPDATE
  USING (auth.uid() = user_id);

-- 어드민 전체 접근
CREATE POLICY "lecture_mission_submissions_select_admin"
  ON lecture_mission_submissions FOR SELECT
  USING (public.is_admin());

CREATE POLICY "lecture_mission_submissions_update_admin"
  ON lecture_mission_submissions FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "lecture_mission_submissions_delete_admin"
  ON lecture_mission_submissions FOR DELETE
  USING (public.is_admin());
