import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthStateSync from "@/components/AuthStateSync";
import ConditionalLayout from "@/components/ConditionalLayout";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TOTODO",
  description: "Next Generation Todo Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        <AuthStateSync />
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  );
}
