export default function KakaoIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3C5.925 3 1 6.925 1 11.775c0 3.05 1.95 5.75 4.975 7.3.25.125.3.3.2.55l-.55 2.175c-.075.35.125.65.45.45l4.825-3.2c.35-.025.7-.05 1.1-.05 6.075 0 11-3.925 11-8.775C23 6.925 18.075 3 12 3z" />
    </svg>
  );
}

