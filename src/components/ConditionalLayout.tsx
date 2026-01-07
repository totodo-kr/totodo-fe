"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import TopSlider from "@/components/TopSlider";
import Footer from "@/components/Footer";

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullPage = pathname?.includes("/session/");

  if (isFullPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <TopSlider />
      <div className="flex justify-center w-full">
        <div className="w-full max-w-[1200px]">{children}</div>
      </div>
      <Footer />
    </>
  );
}
