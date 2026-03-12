"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { fetchInProgressSessions } from "@/lib/queries/quiz";

function modeLabel(value: string) {
  return value === "random" ? "무작위" : "순서대로";
}

function answerModeLabel(value: string) {
  return value === "final" ? "마지막에 채점" : "즉시 채점";
}

export default function ResumePage() {
  const { user, loading } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    fetchInProgressSessions(user.id).then(setSessions).catch(console.error);
  }, [user?.id]);

  if (loading || !user) {
    return <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 sm:px-6">로그인 후 사용할 수 있습니다.</main>;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
        홈으로
      </Link>
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">이어 풀기</h1>
        <div className="mt-4 space-y-2">
          {sessions.map((session) => (
            <article key={session.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
              <div>
                <p className="font-medium">세션 {session.id.slice(0, 8)}</p>
                <p className="text-slate-600">
                  문제 수 {session.question_count} · {modeLabel(session.mode)} · {answerModeLabel(session.answer_mode)}
                </p>
              </div>
              <Link href={`/quiz/play/${session.id}`} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white">
                이어서 풀기
              </Link>
            </article>
          ))}
          {sessions.length === 0 && <p className="text-sm text-slate-500">진행 중인 세션이 없습니다.</p>}
        </div>
      </section>
    </main>
  );
}
