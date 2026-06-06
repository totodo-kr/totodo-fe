"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Camera, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useProfile } from "@/hooks/useProfile";

export default function ProfileEditPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { profile, loading, updateProfile, uploadAvatar } = useProfile(user);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("대한민국(+82)");
  const [jobDescription, setJobDescription] = useState("");

  useEffect(() => {
    if (user) setEmail(user.email || "");
    if (profile) {
      setDisplayName(profile.display_name || "");
      setAvatarUrl(profile.avatar_url || user?.user_metadata?.avatar_url || "");
      setName(profile.name || "");
      setGender(profile.gender || "");
      setPhone(profile.phone || "");
      setCountry(profile.country || "대한민국(+82)");
      setJobDescription(profile.job_description || "");
      if (profile.birth_date) {
        // DB: YYYY-MM-DD → input[type=date] value 형식 동일
        setBirthDate(profile.birth_date.slice(0, 10));
      }
    }
  }, [profile, user]);

  const handleUpdate = async () => {
    if (!user) return;
    try {
      await updateProfile({
        display_name: displayName,
        avatar_url: avatarUrl,
        name,
        gender,
        birth_date: birthDate || null,
        phone,
        country,
        job_description: jobDescription,
      });
      alert("프로필이 수정되었습니다.");
      router.refresh();
    } catch {
      alert("프로필 수정 중 오류가 발생했습니다.");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !user) return;
    try {
      const publicUrl = await uploadAvatar(e.target.files[0]);
      if (publicUrl) setAvatarUrl(publicUrl);
    } catch {
      alert("이미지 업로드 실패");
    }
  };

  return (
    <main className="min-h-screen p-4">
      {/* 헤더 */}
      <div className="relative flex items-center justify-center h-14 mb-6">
        <button onClick={() => router.back()} className="absolute left-0 p-2 text-white">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">프로필 수정</h1>
      </div>

      <div className="flex flex-col gap-6 max-w-md mx-auto">

        {/* 프로필 이미지 */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-[#FFE082] overflow-hidden border-2 border-white/10">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-black font-bold text-3xl">
                  {displayName?.[0] || "U"}
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
        </div>

        {/* 별명 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-gray-300">별명 (닉네임)</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="이름(닉네임)을 입력해주세요"
            className="w-full h-12 bg-zinc-900 rounded-xl px-4 text-white border border-white/5 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        <div className="border-t border-white/5" />

        {/* 이름 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-gray-300">이름</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="실명을 입력해주세요"
            className="w-full h-12 bg-zinc-900/50 rounded-xl px-4 border border-white/10 text-white focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* 성별 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-gray-300">성별</label>
          <div className="relative">
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full h-12 bg-zinc-900/50 rounded-xl px-4 border border-white/10 text-white appearance-none focus:outline-none focus:border-brand-500 transition-colors"
            >
              <option value="" disabled>선택해주세요</option>
              <option value="Male">남성</option>
              <option value="Female">여성</option>
              <option value="Other">기타</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* 생년월일 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-gray-300">생년월일</label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className="w-full h-12 bg-zinc-900/50 rounded-xl px-4 border border-white/10 text-white focus:outline-none focus:border-brand-500 transition-colors [color-scheme:dark]"
          />
        </div>

        <div className="border-t border-white/5" />

        {/* 이메일 (읽기 전용) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-gray-300">이메일</label>
          <input
            type="email"
            value={email}
            readOnly
            className="w-full h-12 bg-zinc-900 rounded-xl px-4 border border-white/5 text-gray-500 cursor-not-allowed"
          />
        </div>

        {/* 휴대폰 번호 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-gray-300">휴대폰 번호</label>
          <div className="flex gap-2">
            <div className="relative w-1/3">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full h-12 bg-zinc-900/50 rounded-xl px-2 text-sm border border-white/10 text-white appearance-none focus:outline-none focus:border-brand-500 transition-colors"
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
              className="w-2/3 h-12 bg-zinc-900/50 rounded-xl px-4 border border-white/10 text-white focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
        </div>

        {/* 하는 일 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-gray-300">하는 일</label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="예) 대학생, 무직, 그림 작가, OO회사 회계업무 등"
            className="w-full h-24 bg-zinc-900/50 rounded-xl p-4 border border-white/10 text-white focus:outline-none focus:border-brand-500 resize-none text-sm leading-relaxed transition-colors"
          />
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={handleUpdate}
          disabled={loading}
          className="w-full h-14 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors mt-2 mb-8 disabled:opacity-50"
        >
          {loading ? "저장 중..." : "저장"}
        </button>

      </div>
    </main>
  );
}
