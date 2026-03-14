"use client";

import Link from "next/link";

interface AuthFallbackProps {
  loading: boolean;
  isAuthenticated: boolean;
  maxWidth?: string;
  backHref?: string;
  backLabel?: string;
  loadingMessage?: string;
  unauthenticatedMessage?: string;
}

export function AuthFallback({
  loading,
  isAuthenticated,
  maxWidth = "max-w-4xl",
  backHref,
  backLabel = "홈으로",
  loadingMessage = "로그인 상태를 확인하는 중입니다.",
  unauthenticatedMessage = "로그인 후 사용할 수 있습니다.",
}: AuthFallbackProps) {
  if (!loading && isAuthenticated) {
    return null;
  }

  return (
    <main className={`mx-auto min-h-screen w-full ${maxWidth} px-4 py-8 sm:px-6`}>
      {backHref ? (
        <Link href={backHref} className="text-sm font-semibold text-brand-700 hover:underline">
          {backLabel}
        </Link>
      ) : null}
      <div className={`${backHref ? "mt-4 " : ""}rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm`}>
        {loading ? loadingMessage : unauthenticatedMessage}
      </div>
    </main>
  );
}
