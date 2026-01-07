"use client";

export default function BoardPage() {
  const boardPosts = [
    {
      id: 1,
      title: "마호 칼럼 📖🌟 - 제 2관。",
      author: "도도토",
      date: "2024-07-29",
      content: "내 발음, 괜찮은 거 맞을까?",
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">마호 칼럼</h2>

      {boardPosts.map((post) => (
        <div
          key={post.id}
          className="bg-zinc-900/50 rounded-lg overflow-hidden hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          <button className="w-full p-6 flex items-center justify-between">
            <div className="flex-1 text-left">
              <h3 className="text-xl font-bold text-white mb-2">
                {post.title}
              </h3>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <span>{post.author}</span>
                <span>{post.date}</span>
              </div>
            </div>
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

          <div className="px-6 pb-6">
            <div className="pt-4 border-t border-white/10">
              <h4 className="text-lg font-bold text-white mb-4">
                내 발음, 괜찮은 거 맞을까?
              </h4>
              <div className="space-y-4 text-gray-300 leading-relaxed">
                <p>
                  이 마호 칼럼을 펼쳐봤다면 한국어가 모국어인 한국인으로서,
                  일본어 발음에 대한 걱정할 일이 사라질 것입니다.
                </p>
                <p>언어에는 /음성학/과 /음운론/이 있습니다.</p>
                <p>
                  음성학은 /묵표로 하는 상상속의 발음/이고, 음운론은 /실제로
                  내는 발음/입니다.
                </p>
                <p>
                  예를 들어 우리는 /비빔밥/이 '넌'을 모두 같은 발음이라고
                  생각합니다.
                </p>
                <p>하지만 이 4개의 넌은 모두 다른 소리를 냅니다.</p>
                <p>
                  실제로 발음할 때는[bibimpa]이라고 한다는 것이죠.
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

