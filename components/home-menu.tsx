"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { signInWithGoogle, signOut } from "@/lib/auth";
import { getQueuedProblemIds, subscribeProblemEditQueue } from "@/lib/problem-edit-queue";
import { fetchInProgressSessions } from "@/lib/queries/quiz";

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

interface MenuButtonProps {
  href: string;
  label: string;
  emoji: string;
  className: string;
}

function MenuButton({ href, label, emoji, className }: MenuButtonProps) {
  return (
    <Link
      href={href}
      className={classNames(
        "flex min-h-36 items-center justify-center gap-3 rounded-[28px] px-5 py-5 text-center text-lg font-semibold text-slate-900 shadow-lg transition hover:-translate-y-0.5 sm:px-6 sm:py-6",
        className,
      )}
    >
      <span className="text-2xl" aria-hidden="true">
        {emoji}
      </span>
      <span>{label}</span>
    </Link>
  );
}

export function HomeMenu() {
  const { user, loading } = useAuth();
  const [hasResumeSession, setHasResumeSession] = useState(false);
  const [queuedEditCount, setQueuedEditCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isLoggedIn = Boolean(user);
  const hasPendingEdits = queuedEditCount > 0;

  useEffect(() => {
    if (!user?.id) {
      setHasResumeSession(false);
      return;
    }

    let active = true;

    const loadSessions = async () => {
      try {
        const sessions = await fetchInProgressSessions(user.id);
        if (active) {
          setHasResumeSession(sessions.length > 0);
        }
      } catch (error) {
        console.error("Failed to load in-progress sessions", error);
        if (active) {
          setHasResumeSession(false);
        }
      }
    };

    void loadSessions();

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setQueuedEditCount(0);
      return;
    }

    const syncQueuedEdits = () => {
      setQueuedEditCount(getQueuedProblemIds(user.id).length);
    };

    syncQueuedEdits();
    return subscribeProblemEditQueue(user.id, syncQueuedEdits);
  }, [user?.id]);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [menuOpen]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <section className="w-full max-w-md rounded-[32px] bg-white px-8 py-12 text-center shadow-xl shadow-slate-200/70">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Take the test</p>
          <p className="mt-4 text-sm text-slate-500">로그인 상태를 확인하고 있습니다.</p>
        </section>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <section className="flex w-full max-w-md flex-col items-center rounded-[32px] bg-white px-8 py-14 text-center shadow-xl shadow-slate-200/70">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Take the test</p>
          <h1 className="mt-4 text-3xl font-bold text-slate-900">개인 문제 학습</h1>
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            className="mt-10 rounded-full bg-slate-900 px-10 py-5 text-lg font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            google 로그인
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col rounded-[36px] bg-white px-4 py-5 shadow-xl shadow-slate-200/70 sm:px-8 sm:py-7">
        <header>
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400 sm:text-sm sm:tracking-[0.3em]">
              Take the test
            </p>
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-300 sm:px-5 sm:py-2.5"
            >
              로그아웃
            </button>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-4xl">개인 문제 학습</h1>
        </header>

        <section className="mt-5 flex flex-1 flex-col justify-start gap-4 sm:mt-6 sm:gap-5">
          <div className={classNames("grid gap-4 sm:gap-5", hasResumeSession ? "grid-cols-4" : "grid-cols-1")}>
            <Link
              href="/quiz/setup"
              className={classNames(
                "flex min-h-36 items-center justify-center gap-3 rounded-[28px] px-5 py-5 text-center text-lg font-semibold text-slate-900 shadow-lg transition hover:-translate-y-0.5 sm:px-6 sm:py-6",
                hasResumeSession ? "col-span-3 bg-sky-100 hover:bg-sky-200" : "bg-sky-100 hover:bg-sky-200",
              )}
            >
              <span className="text-2xl" aria-hidden="true">
                ✍️
              </span>
              <span>문제 풀이</span>
            </Link>

            {hasResumeSession && (
              <Link
                href="/resume"
                className="flex min-h-36 items-center justify-center rounded-[28px] bg-black px-3 py-5 text-center text-base font-semibold text-white shadow-lg shadow-slate-300/70 transition hover:-translate-y-0.5 hover:bg-slate-800 sm:px-4 sm:py-6"
              >
                이어풀기
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            <MenuButton href="/wrong-notes" label="오답 노트" emoji="📄" className="bg-rose-100 hover:bg-rose-200" />
            <MenuButton href="/starred" label="별표 문제" emoji="⭐" className="bg-amber-100 hover:bg-amber-200" />
          </div>
        </section>
      </section>

      <div className="pointer-events-none fixed bottom-6 left-6 z-30 sm:bottom-8 sm:left-8">
        <div ref={menuRef} className="pointer-events-auto relative flex flex-col items-start gap-3">
          {menuOpen && (
            <div className="w-40 rounded-2xl bg-white p-2 shadow-2xl shadow-slate-300/60">
              <Link
                href="/problems"
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                문제 추가
              </Link>
              <Link
                href="/problems/list"
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                문제 목록
              </Link>
              {hasPendingEdits && (
                <Link
                  href="/problem-edit"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  문제 수정
                </Link>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className={classNames(
              "flex h-16 w-16 items-center justify-center rounded-[20px] text-3xl shadow-2xl transition hover:-translate-y-0.5",
              hasPendingEdits
                ? "bg-amber-400 shadow-amber-200/80 hover:bg-amber-500"
                : "bg-slate-500 shadow-slate-300/70 hover:bg-slate-600",
            )}
            aria-label="문제 관리 메뉴 열기"
          >
            ✏️
          </button>
        </div>
      </div>
    </main>
  );
}
