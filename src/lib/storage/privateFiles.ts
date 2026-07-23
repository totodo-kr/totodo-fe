// Supabase Storage의 public/private는 버킷 단위 설정이라 폴더 단위로 나눌 수 없다
// (public 버킷은 RLS와 무관하게 /object/public/ URL로 누구나 접근 가능).
// 그래서 비공개가 필요한 파일은 전용 private 버킷 하나(PRIVATE_BUCKET)에 모으고,
// 파일 종류가 늘어나면 버킷을 새로 만드는 대신 아래처럼 폴더(prefix)만 추가한다.

export const PRIVATE_BUCKET = "totodo_prv_storage";

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function ebookStoragePath(productId: number, fileName: string): string {
  return `ebooks/${productId}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
}
