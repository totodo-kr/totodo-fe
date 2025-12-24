export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-32">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-linear-to-r from-brand-500 to-pink-600 text-transparent bg-clip-text">
          목표를 현실로 만드는
          <br />
          가장 확실한 방법
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mb-12">
          TOTODO와 함께 하루를 계획하고, 성취하고, 성장하세요.
          <br />
          복잡한 도구는 잊으세요. 오직 당신의 목표에만 집중할 수 있습니다.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button className="px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-full font-bold text-lg transition-all hover:scale-105">
            무료로 시작하기
          </button>
          <button className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-full font-bold text-lg transition-all">
            더 알아보기
          </button>
        </div>
      </div>

      {/* Feature Grid (Optional placeholder) */}
      <div className="max-w-7xl mx-auto px-4 py-24 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5">
            <h3 className="text-xl font-bold mb-2 text-brand-500">심플함</h3>
            <p className="text-gray-400">복잡한 설정 없이 바로 시작하세요.</p>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5">
            <h3 className="text-xl font-bold mb-2 text-brand-500">강력함</h3>
            <p className="text-gray-400">데이터는 안전하게, 속도는 빠르게.</p>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5">
            <h3 className="text-xl font-bold mb-2 text-brand-500">자유로움</h3>
            <p className="text-gray-400">플랫폼 종속 없이 어디서나 접속.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
