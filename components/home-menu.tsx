"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signInWithGoogle, signOut } from "@/lib/auth";
import { useAuth } from "@/components/auth-provider";
import { getQueuedProblemIds, subscribeProblemEditQueue } from "@/lib/problem-edit-queue";

interface MenuAction {
  label: string;
  href?: string;
  requiresAuth?: boolean;
}

const menuActions: MenuAction[] = [
  { label: "문제 관리", href: "/problems", requiresAuth: true },
  { label: "문제 풀기", href: "/quiz/setup", requiresAuth: true },
  { label: "오답 노트", href: "/wrong-notes", requiresAuth: true },
  { label: "별표 문제", href: "/starred", requiresAuth: true },
  { label: "이어 풀기", href: "/resume", requiresAuth: true },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export function HomeMenu() {
  const { user, loading } = useAuth();
  const isLoggedIn = Boolean(user);
  const [queuedEditCount, setQueuedEditCount] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      setQueuedEditCount(0);
      return;
    }

    const sync = () => setQueuedEditCount(getQueuedProblemIds(user.id).length);
    sync();
    return subscribeProblemEditQueue(user.id, sync);
  }, [user?.id]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-8 sm:justify-center sm:px-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <header className="mb-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Take The Test</p>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">개인용 문제 학습장</h1>
          <p className="text-sm text-slate-600">
            문제를 직접 등록하고, 랜덤 퀴즈를 풀고, 오답 노트와 별표 문제를 관리할 수 있습니다.
          </p>
          <p className="text-xs text-slate-500">
            {loading
              ? "로그인 상태를 확인하는 중입니다."
              : isLoggedIn
                ? `${user?.email ?? "사용자"}로 로그인되어 있습니다.`
                : "로그인하면 개인 문제 데이터를 저장하고 이어서 학습할 수 있습니다."}
          </p>
        </header>

        <div className="grid gap-3">
          {!isLoggedIn ? (
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              className="rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Google로 로그인
            </button>
          ) : (
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              로그아웃
            </button>
          )}

          {menuActions.map((action) => {
            const disabled = Boolean(action.requiresAuth && !isLoggedIn);
            if (!action.href) return null;

            return (
              <Link
                key={action.label}
                href={action.href}
                aria-disabled={disabled}
                tabIndex={disabled ? -1 : 0}
                className={classNames(
                  "rounded-xl px-4 py-3 text-center text-sm font-semibold transition",
                  disabled
                    ? "pointer-events-none cursor-not-allowed bg-slate-100 text-slate-400"
                    : "bg-slate-900 text-white hover:bg-slate-700",
                )}
              >
                {action.label}
              </Link>
            );
          })}

          {isLoggedIn && queuedEditCount > 0 && (
            <Link
              href="/problem-edit"
              className="rounded-xl bg-amber-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-amber-600"
            >
              문제 수정 {queuedEditCount}건
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
