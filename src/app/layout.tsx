import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-noto-sans-kr",
  weight: ["400", "500", "600", "700"],
});

const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  variable: "--font-noto-serif-kr",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "온라인 강의",
  description: "강의와 커뮤니티를 한곳에서 이용하는 온라인 강의 플랫폼",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${notoSansKr.variable} ${notoSerifKr.variable}`}>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
