"use client";

export default function InformationPage() {
  const descriptionSections = [
    [
      "국내 유일 덕질로 독학할 수 있게 되는 강의, 오레노 니홍고.",
      "시중에 널려있는 시험점수, 자격증을 위한 강의가 아닙니다.",
      "유튜브에서 유행처럼 지나가는 공부법에 대한 강의가 아닙니다.",
    ],
    [
      "인간의 뇌구조가 어떻게 해야 언어를 받아들이는지.",
      "언어를 가장 빠르게 획득할 수 있는 방법이 무엇인지.",
      "일본어 뿐만이 아니라 평생, 다른 분야까지 써먹을 수 있는 내용을 알려드립니다.",
      "왜냐하면, 시대가 지나도 변하지 않는 본질.",
      "그것만이 가치가 있다고 믿으니까요.",
    ],
    [
      "단기적인 시험점수를 원하시면 시중의 강의들을 추천드립니다.",
      "하지만 한번 본질을 배워 평생 스스로 물고기를 잡고싶으시다면,",
      "단연컨대 「오레노 니홍고。」 뿐입니다.",
      "강의에서 기다리겠습니다!",
    ],
    ["* 특별하게 1강을 공개해놓았습니다. 지금 바로 수강해보세요!"],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">강의 소개</h2>
        <div className="space-y-6 text-gray-300 leading-relaxed">
          {descriptionSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-2">
              {section.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex}>{paragraph}</p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
