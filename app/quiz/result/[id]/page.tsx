"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { fetchSession, type SessionWithItems } from "@/lib/queries/quiz";

export default function QuizResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [session, setSession] = useState<SessionWithItems | null>(null);

  useEffect(() => {
    fetchSession(id).then(setSession).catch(console.error);
  }, [id]);

  const items = useMemo(
    () => [...(session?.quiz_session_items ?? [])].sort((a, b) => a.shown_order - b.shown_order),
    [session?.quiz_session_items],
  );

  if (!session) {
    return <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8 sm:px-6">불러오는 중...</main>;
  }

  const correctCount = items.filter((item) => item.is_correct).length;
  const wrongItems = items.filter((item) => item.user_answer !== null && !item.is_correct);
  const wrongCount = wrongItems.length;
  const total = session.question_count;
  const score = session.score ?? (total > 0 ? Number(((correctCount / total) * 100).toFixed(2)) : 0);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
        홈으로
      </Link>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">결과</h1>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3">총 문제 수: {total}</div>
          <div className="rounded-lg bg-slate-50 p-3">정답 수: {correctCount}</div>
          <div className="rounded-lg bg-slate-50 p-3">오답 수: {wrongCount}</div>
          <div className="rounded-lg bg-slate-50 p-3">점수: {score}</div>
        </div>

        <h2 className="mt-6 text-lg font-semibold">오답 문제 목록</h2>
        <div className="mt-2 space-y-2">
          {wrongItems.length === 0 && <p className="text-sm text-slate-500">오답 문제가 없습니다.</p>}
          {wrongItems.map((item, index) => (
            <article key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <p className="font-medium">
                {index + 1}. {item.problems.question_text}
              </p>
              <p className="mt-1 text-slate-600">
                내 답: {item.user_answer} / 정답: {item.problems.correct_answer}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
