"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { signInWithGoogle, signOut } from "@/lib/auth";
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
        "flex min-h-24 items-center justify-center gap-3 rounded-[28px] px-6 py-6 text-center text-base font-semibold text-white shadow-lg shadow-slate-200/70 transition hover:-translate-y-0.5",
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isLoggedIn = Boolean(user);

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
        <section className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white px-8 py-12 text-center shadow-xl shadow-slate-200/70">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Take the test</p>
          <p className="mt-4 text-sm text-slate-500">로그인 상태를 확인하고 있습니다.</p>
        </section>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <section className="flex w-full max-w-md flex-col items-center rounded-[32px] border border-slate-200 bg-white px-8 py-14 text-center shadow-xl shadow-slate-200/70">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Take the test</p>
          <h1 className="mt-4 text-3xl font-bold text-slate-900">개인 문제 학습장</h1>
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
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col rounded-[36px] border border-slate-200 bg-white px-5 py-5 shadow-xl shadow-slate-200/70 sm:px-8 sm:py-7">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Take the test</p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">개인 문제 학습장</h1>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            로그아웃
          </button>
        </header>

        <section className="mt-10 flex flex-1 flex-col justify-center gap-5">
          <div className="flex flex-col gap-5 lg:flex-row">
            <div className={classNames("grid gap-5", hasResumeSession ? "lg:w-full lg:grid-cols-4" : "w-full")}>
              <Link
                href="/quiz/setup"
                className={classNames(
                  "flex min-h-24 items-center justify-center gap-3 rounded-[28px] px-6 py-6 text-center text-base font-semibold text-white shadow-lg shadow-sky-200/70 transition hover:-translate-y-0.5",
                  hasResumeSession ? "lg:col-span-3 bg-sky-400 hover:bg-sky-500" : "bg-sky-400 hover:bg-sky-500",
                )}
              >
                <span className="text-2xl" aria-hidden="true">
                  📝
                </span>
                <span>문제 풀이</span>
              </Link>

              {hasResumeSession && (
                <Link
                  href="/resume"
                  className="flex min-h-24 items-center justify-center rounded-[28px] bg-black px-4 py-6 text-center text-base font-semibold text-white shadow-lg shadow-slate-300/70 transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  이어풀기
                </Link>
              )}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <MenuButton href="/wrong-notes" label="오답 노트" emoji="📝" className="bg-red-500 hover:bg-red-600" />
            <MenuButton href="/starred" label="별표 문제" emoji="⭐" className="bg-yellow-400 text-slate-900 hover:bg-yellow-300" />
          </div>
        </section>
      </section>

      <div ref={menuRef} className="fixed bottom-6 right-6 z-20 flex flex-col items-end gap-3">
        {menuOpen && (
          <div className="w-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-300/60">
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
          </div>
        )}

        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-500 text-3xl shadow-2xl shadow-slate-300/70 transition hover:-translate-y-0.5 hover:bg-slate-600"
          aria-label="문제 관리 메뉴 열기"
        >
          ✏️
        </button>
      </div>
    </main>
  );
}
