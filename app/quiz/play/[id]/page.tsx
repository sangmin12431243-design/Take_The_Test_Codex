
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { applyProblemStats } from "@/lib/queries/problem-stats";
import {
  completeSession,
  fetchSession,
  saveSessionItemAnswer,
  setProblemStar,
  setSessionItemStar,
  type SessionWithItems,
} from "@/lib/queries/quiz";
import type { ExplanationState } from "@/types/quiz";

export default function QuizPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [session, setSession] = useState<SessionWithItems | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [explanationState, setExplanationState] = useState<ExplanationState>("idle");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchSession(id).then(setSession).catch(console.error);
  }, [id]);

  const items = useMemo(
    () => [...(session?.quiz_session_items ?? [])].sort((a, b) => a.shown_order - b.shown_order),
    [session?.quiz_session_items],
  );
  const current = items[currentIndex];
  const progress = items.length > 0 ? Math.round(((currentIndex + 1) / items.length) * 100) : 0;

  useEffect(() => {
    setSelectedAnswer(current?.user_answer ?? null);
    setChecked(current?.is_correct !== null && current?.is_correct !== undefined);
    setExplanationState("idle");
  }, [current?.id]);

  if (loading || !user || !session || !current) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
          ← 첫 페이지로
        </Link>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">로딩 중...</div>
      </main>
    );
  }

  const question = current.problems;

  const resetExplanation = () => setExplanationState("idle");

  const checkAnswer = async () => {
    if (selectedAnswer === null) return;
    setBusy(true);
    try {
      resetExplanation();
      if (session.answer_mode === "instant") {
        const isCorrect = selectedAnswer === question.correct_answer;
        await saveSessionItemAnswer(current.id, selectedAnswer, isCorrect);
        setChecked(true);
      } else {
        await saveSessionItemAnswer(current.id, selectedAnswer, false);
      }
      const fresh = await fetchSession(session.id);
      setSession(fresh);
    } finally {
      setBusy(false);
    }
  };

  const goNext = async () => {
    resetExplanation();
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    setBusy(true);
    try {
      const latest = await fetchSession(session.id);
      const latestItems = [...latest.quiz_session_items].sort((a, b) => a.shown_order - b.shown_order);

      for (const item of latestItems) {
        if (item.user_answer === null) continue;
        const finalCorrect = item.user_answer === item.problems.correct_answer;
        if (item.is_correct !== finalCorrect) {
          await saveSessionItemAnswer(item.id, item.user_answer, finalCorrect);
        }
      }

      const resolved = await fetchSession(session.id);
      const resolvedItems = resolved.quiz_session_items.filter((item) => item.user_answer !== null);
      const correctCount = resolvedItems.filter((item) => item.is_correct).length;
      const score = resolved.question_count > 0 ? Number(((correctCount / resolved.question_count) * 100).toFixed(2)) : 0;

      if (resolved.status === "in_progress") {
        await completeSession(session.id, score);
        await applyProblemStats(
          resolvedItems.map((item) => ({
            userId: user.id,
            problemId: item.problem_id,
            isCorrect: Boolean(item.is_correct),
          })),
        );
      }

      router.push(`/quiz/result/${session.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span>진행률 {currentIndex + 1}/{items.length}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={async () => {
              const next = !current.starred_at_exam_time;
              await setSessionItemStar(current.id, next);
              await setProblemStar(user.id, current.problem_id, next);
              const fresh = await fetchSession(session.id);
              setSession(fresh);
            }}
            className="rounded-lg border border-amber-300 px-3 py-1 text-sm text-amber-700"
          >
            {current.starred_at_exam_time ? "★ 별표됨" : "☆ 별표"}
          </button>
        </div>

        <h1 className="text-lg font-semibold">{question.question_text}</h1>

        <div className="mt-4 grid gap-2">
          {[question.choice_1, question.choice_2, question.choice_3, question.choice_4].map((choice, index) => {
            const value = index + 1;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  resetExplanation();
                  setSelectedAnswer(value);
                }}
                className={`rounded-lg border px-3 py-2 text-left text-sm ${
                  selectedAnswer === value ? "border-brand-500 bg-brand-50" : "border-slate-300"
                }`}
              >
                {value}. {choice}
              </button>
            );
          })}
        </div>

        {session.answer_mode === "instant" && checked && (
          <p className={`mt-3 text-sm ${selectedAnswer === question.correct_answer ? "text-emerald-600" : "text-rose-600"}`}>
            {selectedAnswer === question.correct_answer ? "정답입니다." : `오답입니다. 정답은 ${question.correct_answer}번`}
          </p>
        )}

        {session.show_explanation && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setExplanationState((prev) => (prev === "idle" ? "armed" : prev === "armed" ? "visible" : "visible"))}
              className="rounded-lg border border-slate-300 px-3 py-1 text-xs"
            >
              해설 {explanationState === "idle" ? "(1회: 준비, 2회: 표시)" : explanationState === "armed" ? "준비됨" : "표시중"}
            </button>
            {explanationState === "visible" && (
              <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{question.explanation ?? "해설이 없습니다."}</p>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            disabled={busy || selectedAnswer === null}
            onClick={checkAnswer}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            정답 확인
          </button>
          <button
            type="button"
            disabled={busy || (session.answer_mode === "instant" && !checked)}
            onClick={goNext}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {currentIndex === items.length - 1 ? "결과 보기" : "다음 문제"}
          </button>
        </div>
      </section>
    </main>
  );
}
