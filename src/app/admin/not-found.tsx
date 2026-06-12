import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: "#faf9f5" }}
    >
      <div className="text-center px-6">
        <p
          className="text-8xl font-bold mb-4 select-none"
          style={{ color: "#cc785c" }}
        >
          404
        </p>
        <h1
          className="text-2xl font-semibold mb-2"
          style={{ color: "#141413" }}
        >
          페이지를 찾을 수 없어요
        </h1>
        <p className="text-base mb-8" style={{ color: "#8e8b82" }}>
          관리자 메뉴에 존재하지 않는 페이지입니다.
        </p>
        <Link
          href="/admin"
          className="inline-block px-6 py-3 rounded-lg text-white text-sm font-medium transition-colors hover:opacity-80"
          style={{ background: "#cc785c" }}
        >
          관리자 홈으로
        </Link>
      </div>
    </div>
  );
}
