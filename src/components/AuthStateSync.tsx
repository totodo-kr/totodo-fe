"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";

export default function AuthStateSync() {
  const { setUser, setLoading, user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const routerRef = useRef(router);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  // onAuthStateChange 내부에서 Supabase 쿼리를 호출하면 내부 lock 충돌로 hang됨
  // (https://github.com/supabase/auth-js/issues/762)
  // → 리스너는 상태 동기화만 담당, Supabase 호출은 별도 useEffect에서 처리
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // 탭 포커스 복귀 시 Supabase가 동일 세션에 대해 이벤트를 재발화하는 경우가 있음
    // (session.user는 매번 새로 역직렬화되어 참조가 달라짐) → id가 실제로 바뀐 경우만 반영
    // 그렇지 않으면 user를 deps로 쓰는 전역 useEffect들이 탭 전환마다 재실행되어
    // 편집 중이던 폼이 서버 데이터로 리셋되는 문제가 발생함
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      const currentUser = useAuthStore.getState().user;

      if (currentUser?.id !== nextUser?.id) {
        setUser(nextUser);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setLoading]);

  // 온보딩 체크: user가 생긴 후 onAuthStateChange 바깥에서 실행 (deadlock 방지)
  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single()
      .then(({ data: profile }) => {
        if (!profile?.display_name && pathnameRef.current !== "/onboarding") {
          routerRef.current.push("/onboarding");
        }
      });
  }, [user]);

  return null;
}
