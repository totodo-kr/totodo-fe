"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useProfile } from "@/hooks/useProfile";
import PageLoading from "@/components/PageLoading";
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react";

type Step = 1 | 2 | 3;

const TOTAL_STEPS = 3;

const STEP_LABELS = ["닉네임", "개인 정보", "연락처 & 직업"];

const YEARS = Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - 10 - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const COUNTRY_OPTIONS = [
  { value: "대한민국(+82)", label: "대한민국(+82)" },
  { value: "일본(+81)", label: "일본(+81)" },
  { value: "미국(+1)", label: "미국(+1)" },
  { value: "중국(+86)", label: "중국(+86)" },
];

export default function OnboardingPage() {
  const { user, isLoading } = useAuthStore();
  const { profile, loading: profileLoading, updateProfile } = useProfile(user);
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [displayName, setDisplayName] = useState("");

  // Step 2
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");

  // Step 3
  const [country, setCountry] = useState("대한민국(+82)");
  const [phone, setPhone] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  // 소셜 로그인 메타데이터로 닉네임 프리필
  useEffect(() => {
    if (user?.user_metadata?.full_name && !displayName) {
      setDisplayName(user.user_metadata.full_name);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // 이미 닉네임 있으면 온보딩 불필요
  useEffect(() => {
    if (!isLoading && !profileLoading && profile?.display_name) {
      router.replace("/");
    }
  }, [isLoading, profileLoading, profile, router]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  const saveAndFinish = async (skipFrom?: Step) => {
    setSaving(true);
    try {
      const updates: Parameters<typeof updateProfile>[0] = {};

      // 현재까지 입력된 값 수집
      if (skipFrom === undefined || skipFrom > 1) {
        if (displayName.trim()) updates.display_name = displayName.trim();
      }
      if (skipFrom === undefined || skipFrom > 2) {
        if (name.trim()) updates.name = name.trim();
        if (gender) updates.gender = gender;
        if (birthYear && birthMonth && birthDay) {
          updates.birth_date = `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`;
        }
      }
      if (skipFrom === undefined) {
        if (phone.trim()) updates.phone = phone.trim();
        if (country) updates.country = country;
        if (jobDescription.trim()) updates.job_description = jobDescription.trim();
      }

      if (Object.keys(updates).length > 0) {
        await updateProfile(updates);
      }
      router.replace("/");
    } catch {
      alert("저장 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS) {
      setStep((prev) => (prev + 1) as Step);
    } else {
      await saveAndFinish();
    }
  };

  const handleSkip = async () => {
    if (step < TOTAL_STEPS) {
      setStep((prev) => (prev + 1) as Step);
    } else {
      await saveAndFinish(step);
    }
  };

  if (isLoading || profileLoading) return <PageLoading variant="top" />;
  if (!user) return null;

  const isStep1Valid = displayName.trim().length > 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm flex flex-col gap-8">

        {/* 브랜드 */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-brand-500/30">
            도
          </div>
          {step === 1 && (
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-brand-400" />
              <span className="text-brand-400 text-sm font-medium">가입을 환영합니다!</span>
              <Sparkles size={14} className="text-brand-400" />
            </div>
          )}
        </div>

        {/* 진행 단계 */}
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const s = i + 1;
            const isActive = s === step;
            const isDone = s < step;
            return (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`flex-1 h-1 rounded-full transition-colors ${
                    isDone || isActive ? "bg-brand-500" : "bg-white/10"
                  }`}
                />
                {i < TOTAL_STEPS - 1 && (
                  <ChevronRight size={12} className={isDone ? "text-brand-400" : "text-white/20"} />
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 -mt-4 text-center">
          {step} / {TOTAL_STEPS} — {STEP_LABELS[step - 1]}
        </p>

        {/* 스텝 콘텐츠 */}
        <div className="flex flex-col gap-6">

          {/* Step 1: 닉네임 */}
          {step === 1 && (
            <>
              <div className="space-y-1">
                <h1 className="text-white text-xl font-bold">닉네임을 설정해주세요</h1>
                <p className="text-gray-400 text-sm">서비스에서 사용할 이름을 입력해주세요.</p>
              </div>
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && isStep1Valid && handleNext()}
                  placeholder="닉네임 입력 (최대 20자)"
                  maxLength={20}
                  autoFocus
                  className="w-full h-14 bg-[#1a1a1a] border border-white/10 rounded-xl px-5 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
                />
                <p className="text-right text-xs text-gray-600">{displayName.length}/20</p>
              </div>
            </>
          )}

          {/* Step 2: 개인 정보 */}
          {step === 2 && (
            <>
              <div className="space-y-1">
                <h1 className="text-white text-xl font-bold">개인 정보를 입력해주세요</h1>
                <p className="text-gray-400 text-sm">모두 선택 항목이에요. 나중에 수정할 수 있어요.</p>
              </div>
              <div className="space-y-4">
                {/* 이름 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">이름</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="실명 입력"
                    className="w-full h-12 bg-[#1a1a1a] border border-white/10 rounded-xl px-4 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>

                {/* 성별 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">성별</label>
                  <div className="relative">
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full h-12 bg-[#1a1a1a] border border-white/10 rounded-xl px-4 text-white appearance-none focus:outline-none focus:border-brand-500 transition-colors"
                    >
                      <option value="" disabled>선택</option>
                      <option value="Male">남성</option>
                      <option value="Female">여성</option>
                      <option value="Other">기타</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                </div>

                {/* 생년월일 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">생년월일</label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* 년 */}
                    <div className="relative">
                      <select
                        value={birthYear}
                        onChange={(e) => setBirthYear(e.target.value)}
                        className="w-full h-12 bg-[#1a1a1a] border border-white/10 rounded-xl px-3 text-white appearance-none focus:outline-none focus:border-brand-500 transition-colors text-sm"
                      >
                        <option value="" disabled>년도</option>
                        {YEARS.map((y) => <option key={y} value={y}>{y}년</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
                    {/* 월 */}
                    <div className="relative">
                      <select
                        value={birthMonth}
                        onChange={(e) => setBirthMonth(e.target.value)}
                        className="w-full h-12 bg-[#1a1a1a] border border-white/10 rounded-xl px-3 text-white appearance-none focus:outline-none focus:border-brand-500 transition-colors text-sm"
                      >
                        <option value="" disabled>월</option>
                        {MONTHS.map((m) => <option key={m} value={m}>{m}월</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
                    {/* 일 */}
                    <div className="relative">
                      <select
                        value={birthDay}
                        onChange={(e) => setBirthDay(e.target.value)}
                        className="w-full h-12 bg-[#1a1a1a] border border-white/10 rounded-xl px-3 text-white appearance-none focus:outline-none focus:border-brand-500 transition-colors text-sm"
                      >
                        <option value="" disabled>일</option>
                        {DAYS.map((d) => <option key={d} value={d}>{d}일</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 3: 연락처 & 직업 */}
          {step === 3 && (
            <>
              <div className="space-y-1">
                <h1 className="text-white text-xl font-bold">연락처와 직업을 알려주세요</h1>
                <p className="text-gray-400 text-sm">모두 선택 항목이에요. 나중에 수정할 수 있어요.</p>
              </div>
              <div className="space-y-4">
                {/* 휴대폰 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">휴대폰 번호</label>
                  <div className="flex gap-2">
                    <div className="relative w-2/5">
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full h-12 bg-[#1a1a1a] border border-white/10 rounded-xl px-3 text-white appearance-none focus:outline-none focus:border-brand-500 transition-colors text-xs"
                      >
                        {COUNTRY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01012345678"
                      className="flex-1 h-12 bg-[#1a1a1a] border border-white/10 rounded-xl px-4 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>
                </div>

                {/* 직업 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">하시는 일</label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="예) 대학생, 무직, 그림 작가, 회계 담당자 등"
                    rows={3}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors resize-none text-sm leading-relaxed"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* 버튼 */}
        <div className="space-y-3">
          <button
            onClick={handleNext}
            disabled={step === 1 && !isStep1Valid || saving}
            className="w-full h-13 py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "저장 중..." : step === TOTAL_STEPS ? "시작하기" : "다음"}
          </button>
          <button
            onClick={handleSkip}
            disabled={saving}
            className="w-full h-10 text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            {step === TOTAL_STEPS ? "건너뛰고 시작하기" : "이 단계 건너뛰기"}
          </button>
        </div>

      </div>
    </div>
  );
}
