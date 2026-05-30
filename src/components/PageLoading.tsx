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
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent" />
        {message && <p className="mt-4 text-gray-400">{message}</p>}
      </div>
    </div>
  );
}
