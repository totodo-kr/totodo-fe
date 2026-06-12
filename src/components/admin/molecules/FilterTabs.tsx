"use client";

interface Tab<T> {
  label: string;
  value: T;
}

interface FilterTabsProps<T> {
  tabs: Tab<T>[];
  active: T;
  onChange: (value: T) => void;
  className?: string;
}

export default function FilterTabs<T extends string | number | undefined>({
  tabs,
  active,
  onChange,
  className = "",
}: FilterTabsProps<T>) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {tabs.map((tab) => (
        <button
          key={String(tab.value ?? "all")}
          onClick={() => onChange(tab.value)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={
            active === tab.value
              ? { background: "#cc785c", color: "#fff" }
              : { background: "#efe9de", color: "#6c6a64" }
          }
          onMouseEnter={(e) => {
            if (active !== tab.value)
              (e.currentTarget as HTMLButtonElement).style.background = "#e6dfd8";
          }}
          onMouseLeave={(e) => {
            if (active !== tab.value)
              (e.currentTarget as HTMLButtonElement).style.background = "#efe9de";
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
