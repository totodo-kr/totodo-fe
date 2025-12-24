"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Camera, ChevronDown } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";

type Tab = "basic" | "extra";

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>("basic");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form States
  // Basic Tab State
  const [displayName, setDisplayName] = useState("");
  
  // Extra Tab States
  const [profileName, setProfileName] = useState("");
  const [gender, setGender] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("대한민국(+82)");
  const [jobDescription, setJobDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  
  // Auth Email
  const [email, setEmail] = useState("");

  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      setEmail(user.email || "");
      
      if (user) {
        // Basic Info - Auth Metadata
        setDisplayName(user.user_metadata?.full_name || user.user_metadata?.name || "");
      }
      
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        // Extra Info - Profile Table
        setProfileName(profile.name || "");
        setGender(profile.gender || "");
        setPhone(profile.phone || ""); // DB에 phone 컬럼 필요
        setCountry(profile.country || "대한민국(+82)");
        setJobDescription(profile.job_description || "");
        setAvatarUrl(profile.avatar_url || user.user_metadata?.avatar_url || "");

        if (profile.birth_date) {
          const date = new Date(profile.birth_date);
          setBirthYear(date.getFullYear().toString());
          setBirthMonth((date.getMonth() + 1).toString());
          setBirthDay(date.getDate().toString());
        }
      }
    };

    fetchProfile();
  }, [user]);

  const handleUpdate = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Basic Info Update (Auth Metadata)
      if (activeTab === "basic") {
        const { error: authError } = await supabase.auth.updateUser({
          data: { 
            name: displayName,
            full_name: displayName,
            avatar_url: avatarUrl 
          }
        });
        
        if (authError) throw authError;

        // Also update avatar_url in profiles table to keep in sync
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ avatar_url: avatarUrl })
          .eq("id", user.id);

        if (profileError) throw profileError;

      } else {
        // 2. Extra Info Update (Profiles Table)
        let birthDate = null;
        if (birthYear && birthMonth && birthDay) {
          birthDate = `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`;
        }

        const updates = {
          name: profileName,
          gender,
          birth_date: birthDate,
          phone,
          country,
          job_description: jobDescription,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", user.id);

        if (error) throw error;
      }
      
      alert("프로필이 수정되었습니다.");
      router.refresh();
      
      // Force refresh auth state to update UI immediately
      const { data: { session } } = await supabase.auth.refreshSession();
      setUser(session?.user ?? null);
      
    } catch (error) {
      console.error(error);
      alert("프로필 수정 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;

    const file = e.target.files[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    setLoading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from("review_files") // 프로필용 버킷을 따로 만들거나 기존 것 사용. 여기선 review_files 임시 사용 또는 avatars 버킷 안내 필요
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("review_files").getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    } catch (error) {
      console.error(error);
      alert("이미지 업로드 실패");
    } finally {
      setLoading(false);
    }
  };

  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <main className="min-h-screen bg-black text-white p-4 pb-24">
      {/* Header */}
      <div className="relative flex items-center justify-center h-14 mb-4">
        <button 
          onClick={() => router.back()}
          className="absolute left-0 p-2 text-white"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">프로필</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-8">
        <button
          onClick={() => setActiveTab("basic")}
          className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
            activeTab === "basic" ? "text-brand-500" : "text-gray-500"
          }`}
        >
          기본 정보
          {activeTab === "basic" && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("extra")}
          className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
            activeTab === "extra" ? "text-brand-500" : "text-gray-500"
          }`}
        >
          추가 정보
          {activeTab === "extra" && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-500" />
          )}
        </button>
      </div>

      <div className="flex flex-col gap-6 max-w-md mx-auto">
        {activeTab === "basic" ? (
          /* Basic Info Tab */
          <div className="flex flex-col items-center gap-8">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-[#FFE082] overflow-hidden border-2 border-white/10">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-black font-bold text-3xl">
                    User
                  </div>
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
                accept="image/*"
              />
            </div>

            <div className="w-full">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="이름(닉네임)을 입력해주세요"
                className="w-full h-14 bg-zinc-900 rounded-xl px-4 text-white text-center border border-white/5 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>
        ) : (
          /* Extra Info Tab */
          <div className="flex flex-col gap-8">
            {/* 개인 정보 */}
            <section className="flex flex-col gap-4">
              <h3 className="text-lg font-bold">개인 정보</h3>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-300">이름</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full h-12 bg-zinc-900/50 rounded-lg px-4 border border-white/10 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-300">성별</label>
                <div className="relative">
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full h-12 bg-zinc-900/50 rounded-lg px-4 border border-white/10 text-white appearance-none focus:outline-none focus:border-brand-500"
                  >
                    <option value="" disabled>선택해주세요</option>
                    <option value="Male">남성</option>
                    <option value="Female">여성</option>
                    <option value="Other">기타</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-300">출생연도</label>
                <div className="relative">
                  <select
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    className="w-full h-12 bg-zinc-900/50 rounded-lg px-4 border border-white/10 text-white appearance-none focus:outline-none focus:border-brand-500"
                  >
                    <option value="" disabled>년도</option>
                    {years.map(y => <option key={y} value={y}>{y}년</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-300">출생월</label>
                <div className="relative">
                  <select
                    value={birthMonth}
                    onChange={(e) => setBirthMonth(e.target.value)}
                    className="w-full h-12 bg-zinc-900/50 rounded-lg px-4 border border-white/10 text-white appearance-none focus:outline-none focus:border-brand-500"
                  >
                    <option value="" disabled>월</option>
                    {months.map(m => <option key={m} value={m}>{m}월</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-300">출생일</label>
                <div className="relative">
                  <select
                    value={birthDay}
                    onChange={(e) => setBirthDay(e.target.value)}
                    className="w-full h-12 bg-zinc-900/50 rounded-lg px-4 border border-white/10 text-white appearance-none focus:outline-none focus:border-brand-500"
                  >
                    <option value="" disabled>일</option>
                    {days.map(d => <option key={d} value={d}>{d}일</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                </div>
              </div>
            </section>

            {/* 연락 정보 */}
            <section className="flex flex-col gap-4">
              <h3 className="text-lg font-bold">연락 정보</h3>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-300">개인 이메일 주소</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full h-12 bg-zinc-900 rounded-lg px-4 border border-white/5 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-300">휴대폰 번호</label>
                <div className="flex gap-2">
                  <div className="relative w-1/3">
                    <select 
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full h-12 bg-zinc-900/50 rounded-lg px-2 text-sm border border-white/10 text-white appearance-none focus:outline-none focus:border-brand-500"
                    >
                      <option value="대한민국(+82)">대한민국(+82)</option>
                      <option value="일본(+81)">일본(+81)</option>
                      <option value="미국(+1)">미국(+1)</option>
                      <option value="중국(+86)">중국(+86)</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-2/3 h-12 bg-zinc-900/50 rounded-lg px-4 border border-white/10 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </section>

            {/* 추가 정보 */}
            <section className="flex flex-col gap-4">
              <h3 className="text-lg font-bold">추가 정보</h3>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-300">
                  어떤 일을 하고 계신가요? 예) 대학생, 무직, 그림 작가, OO회사 회계업무 등
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="직업을 입력해주세요"
                  className="w-full h-24 bg-zinc-900/50 rounded-lg p-4 border border-white/10 text-white focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>
            </section>
          </div>
        )}

        <button
          onClick={handleUpdate}
          disabled={loading}
          className="w-full h-14 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors mt-4 disabled:opacity-50"
        >
          {loading ? "저장 중..." : "수정"}
        </button>
      </div>
    </main>
  );
}

