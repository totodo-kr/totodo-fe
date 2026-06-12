import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <div className="text-center px-6">
        <p className="text-9xl font-bold mb-4 select-none bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
          404
        </p>
        <h1 className="text-2xl font-semibold mb-2 text-white">
          페이지를 찾을 수 없어요
        </h1>
        <p className="text-base mb-8 text-zinc-400">
          주소가 잘못되었거나 삭제된 페이지입니다.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-lg text-white text-sm font-medium bg-brand-500 hover:bg-brand-400 transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
