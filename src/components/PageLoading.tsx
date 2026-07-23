import { Spinner } from "@/components/ui/atoms";

interface PageLoadingProps {
  message?: string;
  variant?: "center" | "top";
}

export default function PageLoading({ message, variant = "center" }: PageLoadingProps) {
  const wrapperClass =
    variant === "top"
      ? "min-h-screen pt-24 flex justify-center"
      : "min-h-screen flex items-center justify-center";

  return (
    <div className={wrapperClass}>
      <div className="text-center">
        <div className="inline-block">
          <Spinner size="xl" />
        </div>
        {message && <p className="mt-4 text-gray-400">{message}</p>}
      </div>
    </div>
  );
}
