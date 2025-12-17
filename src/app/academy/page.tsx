"use client";

import Image from "next/image";

export default function AcademyPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-[1600px] mx-auto">
        {/* Course Card */}
        <div className="flex flex-col gap-4 group cursor-pointer">
          {/* Image Container */}
          <div className="relative overflow-hidden rounded-2xl w-full aspect-[750/450] bg-zinc-800 border border-white/5">
            <Image
              src="https://images.unsplash.com/photo-1528164344705-47542687000d?q=80&w=2992&auto=format&fit=crop"
              alt="오레노 니홍고"
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Hover Overlay (Optional) */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </div>

          {/* Text Content */}
          <div className="flex flex-col gap-2">
            <h3 className="text-2xl font-bold text-white group-hover:text-purple-400 transition-colors">
              오레노 니홍고
            </h3>
            <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
              <span>총 33세션</span>
              <span className="w-1 h-1 rounded-full bg-gray-500" />
              <span>도도토</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

