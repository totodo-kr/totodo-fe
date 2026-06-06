"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";

export default function AuthStateSync() {
  const { setUser, setLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();

    const checkUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);

      // SIGNED_IN: 모달 로그인 (이메일/비밀번호)
      // INITIAL_SESSION: 소셜 로그인 콜백 후 리다이렉트로 페이지가 새로 로드될 때
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", session.user.id)
          .single();

        if (!profile?.display_name && pathnameRef.current !== "/onboarding") {
          router.push("/onboarding");
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setLoading, router]);

  return null;
}
