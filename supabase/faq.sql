-- =============================================
-- FAQ 테이블
-- 사전 조건: common.sql (is_admin 함수)
-- =============================================
CREATE TABLE public.faq (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  author_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_faq_updated_at
  BEFORE UPDATE ON public.faq
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faq select for all"  ON public.faq FOR SELECT USING (true);
CREATE POLICY "faq insert for admin" ON public.faq FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "faq update for admin" ON public.faq FOR UPDATE USING (public.is_admin());
CREATE POLICY "faq delete for admin" ON public.faq FOR DELETE USING (public.is_admin());
