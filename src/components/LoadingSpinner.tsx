import { twMerge } from "tailwind-merge";
import { Spinner } from "@/components/ui/atoms";

export default function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={twMerge("flex items-center justify-center py-8", className)}>
      <Spinner size="xl" />
    </div>
  );
}
