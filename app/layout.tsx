import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: "Take The Test - 개인용 객관식 문제집",
  description: "문제 등록, 문제풀이, 오답 노트, 별표 문제 관리 기능을 제공하는 개인용 퀴즈 앱",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
