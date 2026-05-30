import { twMerge } from "tailwind-merge";

export default function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={twMerge("flex items-center justify-center py-8", className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent" />
    </div>
  );
}
