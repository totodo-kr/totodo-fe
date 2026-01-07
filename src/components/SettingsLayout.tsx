"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";

interface SettingsLayoutProps {
  title: string;
  children: ReactNode;
}

export default function SettingsLayout({ title, children }: SettingsLayoutProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="relative flex items-center justify-center h-14 mb-4">
          <button onClick={() => router.back()} className="absolute left-0 p-2 text-white">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">{title}</h1>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}

