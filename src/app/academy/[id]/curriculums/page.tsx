"use client";

export default function CurriculumsPage() {
  const courseData = {
    totalSessions: 33,
  };

  const curriculum = [
    {
      chapter: "第一章) 자신의 길은 자신이 정한다.",
      sessions: [
        { id: 1, title: "01. 「오와엔데이서」", duration: "09:50", preview: true },
        { id: 2, title: "02. 「슬픈 좋아하니?」", duration: "26:08", locked: true },
        {
          id: 3,
          title: "03. 「일본어 실력에 늘지 않는 느낌이 든다고?」",
          duration: "05:41",
          locked: true,
        },
        { id: 4, title: "04. 「MBTI는 E? 아니면 I?」", duration: "11:05", locked: true },
        {
          id: 5,
          title: "05. 「그럼, 최고의 인조은 뭐야?」",
          duration: "13:11",
          locked: true,
        },
        {
          id: 6,
          title: "06. 「일본어의 문자가 많은 이유, 알고 있니?」",
          duration: "09:47",
          locked: true,
          hasAttachment: true,
        },
        {
          id: 7,
          title: "07. 「도도토류 최고의 단어장。」",
          duration: "08:46",
          locked: true,
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">목차</h2>
        <p className="text-gray-400 text-sm">
          클래스 구매 후 수강이 가능합니다.
        </p>
      </div>

      <div className="bg-zinc-900/50 rounded-lg p-4 mb-4">
        <p className="text-gray-300">총 {courseData.totalSessions} 세션</p>
      </div>

      {curriculum.map((chapter, chapterIndex) => (
        <div key={chapterIndex} className="space-y-4">
          <button className="w-full flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg hover:bg-zinc-900 transition-colors">
            <h3 className="text-xl font-bold text-white text-left">
              {chapter.chapter}
            </h3>
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          <div className="space-y-2 pl-4">
            {chapter.sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-lg hover:bg-zinc-900/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <button className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{session.title}</p>
                      {session.preview && (
                        <span className="px-2 py-0.5 bg-brand-500 text-white text-xs font-bold rounded">
                          미리보기
                        </span>
                      )}
                      {session.hasAttachment && (
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                          />
                        </svg>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">{session.duration}</p>
                  </div>
                </div>
                {session.locked && (
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

