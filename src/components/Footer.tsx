export default function Footer() {
  return (
    <footer className="bg-zinc-900 border-t border-white/10 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <span className="text-xl font-bold text-purple-500 mb-4 block">
              TOTODO
            </span>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
              비플 종속에서 벗어나 자유로운 커스텀 개발을 지향합니다.
              <br />
              더 빠르고, 더 예쁘고, 더 강력한 기능을 만나보세요.
            </p>
          </div>
          <div>
            <h3 className="text-white font-bold mb-4">Service</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white">이세계 학원</a></li>
              <li><a href="#" className="hover:text-white">상점</a></li>
              <li><a href="#" className="hover:text-white">강의 후기</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white">자주 묻는 질문</a></li>
              <li><a href="#" className="hover:text-white">문의하기</a></li>
              <li><a href="#" className="hover:text-white">이용약관</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8 text-center text-sm text-gray-500">
          © 2024 TOTODO. All rights reserved.
        </div>
      </div>
    </footer>
  );
}


