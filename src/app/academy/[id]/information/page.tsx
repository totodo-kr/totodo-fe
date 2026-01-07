"use client";

export default function InformationPage() {
  const courseData = {
    description: [
      "국내 유일 덕질로 독학할 수 있게 되는 강의, 오레노 니홍고.",
      "시중에 널려있는 시험점수, 자격증을 위한 강의가 아닙니다.",
      "유튜브에서 유행처럼 지나가는 공부법에 대한 강의가 아닙니다.",
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">강의 소개</h2>
        <div className="space-y-4 text-gray-300 leading-relaxed">
          {courseData.description.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

