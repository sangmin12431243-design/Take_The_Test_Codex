"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { AuthFallback } from "@/components/auth-fallback";
import { ProblemImage } from "@/components/problem-image";
import { dequeueProblemForEdit, getQueuedProblemIds, queueProblemForEdit, subscribeProblemEditQueue } from "@/lib/problem-edit-queue";
import { updateProblemExplanation } from "@/lib/queries/problems";
import { applyProblemStats } from "@/lib/queries/problem-stats";
import {
  completeSession,
  fetchSession,
  saveSessionItemAnswer,
  saveSessionItemSelection,
  setProblemStar,
  setSessionItemStar,
  type SessionWithItems,
} from "@/lib/queries/quiz";
import type { ExplanationState } from "@/types/quiz";

interface ShuffledChoice {
  originalAnswer: number;
  text: string;
}

type SubmitDialogState = "closed" | "unanswered" | "ready";

function createSeed(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildShuffledChoices(problemId: string, question: SessionWithItems["quiz_session_items"][number]["problems"]): ShuffledChoice[] {
  const choices: ShuffledChoice[] = [
    { originalAnswer: 1, text: question.choice_1 },
    { originalAnswer: 2, text: question.choice_2 },
    { originalAnswer: 3, text: question.choice_3 },
    { originalAnswer: 4, text: question.choice_4 },
  ];
  const shuffled = [...choices];
  let seed = createSeed(problemId);

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function QuizPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [session, setSession] = useState<SessionWithItems | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, number | null>>({});
  const [explanationState, setExplanationState] = useState<ExplanationState>("idle");
  const [busy, setBusy] = useState(false);
  const [selectionBusy, setSelectionBusy] = useState(false);
  const [queuedProblemIds, setQueuedProblemIds] = useState<string[]>([]);
  const [navOpen, setNavOpen] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [submitDialog, setSubmitDialog] = useState<SubmitDialogState>("closed");
  const [editingExplanation, setEditingExplanation] = useState(false);
  const [explanationDraft, setExplanationDraft] = useState("");

  useEffect(() => {
    fetchSession(id).then(setSession).catch(console.error);
  }, [id]);

  useEffect(() => {
    if (!user?.id) return;
    const sync = () => setQueuedProblemIds(getQueuedProblemIds(user.id));
    sync();
    return subscribeProblemEditQueue(user.id, sync);
  }, [user?.id]);

  useEffect(() => {
    if (!session?.started_at) return;
    const update = () => {
      const startedAt = new Date(session.started_at).getTime();
      const diff = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      setElapsedSeconds(diff);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [session?.started_at]);

  const items = useMemo(
    () => [...(session?.quiz_session_items ?? [])].sort((a, b) => a.shown_order - b.shown_order),
    [session?.quiz_session_items],
  );
  const current = items[currentIndex];
  const question = current?.problems ?? null;
  const unansweredIndexes = useMemo(
    () => items.map((item, index) => (item.user_answer === null ? index : -1)).filter((index) => index >= 0),
    [items],
  );
  const progress = items.length > 0 ? Math.round((items.filter((item) => item.user_answer !== null).length / items.length) * 100) : 0;

  useEffect(() => {
    if (!current) {
      setSelectedAnswer(null);
      return;
    }
    setSelectedAnswer(current.user_answer ?? draftAnswers[current.id] ?? null);
    setExplanationState("idle");
    setEditingExplanation(false);
    setExplanationDraft(current.problems.explanation ?? "");
  }, [current, draftAnswers]);

  const shuffledChoices = useMemo(() => {
    if (!current || !question) return [];
    return buildShuffledChoices(current.id, question);
  }, [current, question]);

  if (loading || !user) {
    return <AuthFallback loading={loading} isAuthenticated={Boolean(user)} maxWidth="max-w-3xl" backHref="/" />;
  }

  if (!session || !current || !question) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
          홈으로
        </Link>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">불러오는 중...</div>
      </main>
    );
  }

  const updateItemState = (itemId: string, updates: Partial<SessionWithItems["quiz_session_items"][number]>) => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        quiz_session_items: prev.quiz_session_items.map((item) => (item.id === itemId ? { ...item, ...updates } : item)),
      };
    });
  };

  const currentIsLocked = current.is_correct !== null;
  const currentIsCorrect = current.is_correct === true;
  const currentIsWrong = current.is_correct === false;
  const currentHasSelection = selectedAnswer !== null;

  const handleSelectAnswer = async (answer: number) => {
    if (currentIsLocked) return;

    setSelectedAnswer(answer);
    setDraftAnswers((prev) => ({ ...prev, [current.id]: answer }));
    updateItemState(current.id, { user_answer: answer, is_correct: null });

    setSelectionBusy(true);
    try {
      await saveSessionItemSelection(current.id, answer);
    } finally {
      setSelectionBusy(false);
    }
  };

  const handleInstantCheck = async () => {
    if (selectedAnswer === null || currentIsLocked) return;
    setBusy(true);
    try {
      const isCorrect = selectedAnswer === question.correct_answer;
      await saveSessionItemAnswer(current.id, selectedAnswer, isCorrect);
      updateItemState(current.id, { user_answer: selectedAnswer, is_correct: isCorrect });
      if (!isCorrect) {
        setExplanationState("visible");
      }
    } finally {
      setBusy(false);
    }
  };

  const saveExplanation = async () => {
    setBusy(true);
    try {
      await updateProblemExplanation(current.problem_id, explanationDraft);
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          quiz_session_items: prev.quiz_session_items.map((item) =>
            item.id === current.id
              ? {
                  ...item,
                  problems: {
                    ...item.problems,
                    explanation: explanationDraft || null,
                  },
                }
              : item,
          ),
        };
      });
      setEditingExplanation(false);
      setExplanationState("visible");
    } finally {
      setBusy(false);
    }
  };

  const finalizeSession = async () => {
    setBusy(true);
    try {
      const latest = await fetchSession(session.id);
      const latestItems = [...latest.quiz_session_items].sort((a, b) => a.shown_order - b.shown_order);

      for (const item of latestItems) {
        if (item.user_answer === null) continue;
        if (item.is_correct !== null) continue;
        const finalCorrect = item.user_answer === item.problems.correct_answer;
        await saveSessionItemAnswer(item.id, item.user_answer, finalCorrect);
      }

      const resolved = await fetchSession(session.id);
      const resolvedItems = resolved.quiz_session_items.filter((item) => item.user_answer !== null);
      const statEligibleItems = resolvedItems.filter((item) => !queuedProblemIds.includes(item.problem_id));
      const correctCount = resolvedItems.filter((item) => item.is_correct).length;
      const score = resolved.question_count > 0 ? Number(((correctCount / resolved.question_count) * 100).toFixed(2)) : 0;

      if (resolved.status === "in_progress") {
        await completeSession(session.id, score);
        await applyProblemStats(
          statEligibleItems.map((item) => ({
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

  const openSubmitDialog = () => {
    setSubmitDialog(unansweredIndexes.length > 0 ? "unanswered" : "ready");
  };

  const moveToFirstUnanswered = () => {
    if (unansweredIndexes.length === 0) {
      setSubmitDialog("closed");
      return;
    }
    setCurrentIndex(unansweredIndexes[0]);
    setSubmitDialog("closed");
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
          홈으로
        </Link>
        <button
          type="button"
          onClick={() => setNavOpen((prev) => !prev)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {navOpen ? "네비게이션 숨기기" : "네비게이션 보기"}
        </button>
      </div>

      <header className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span>
            진행 {currentIndex + 1}/{items.length}
          </span>
          <span>풀이 시간 {formatDuration(elapsedSeconds)}</span>
          <span>답안 완료 {items.length - unansweredIndexes.length}/{items.length}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <div className={`grid gap-4 ${navOpen ? "lg:grid-cols-[minmax(0,1fr)_280px]" : "lg:grid-cols-1"}`}>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                if (queuedProblemIds.includes(current.problem_id)) {
                  dequeueProblemForEdit(user.id, current.problem_id);
                  setQueuedProblemIds((prev) => prev.filter((problemId) => problemId !== current.problem_id));
                  return;
                }

                queueProblemForEdit(user.id, current.problem_id);
                setQueuedProblemIds((prev) => (prev.includes(current.problem_id) ? prev : [...prev, current.problem_id]));
              }}
              className={`rounded-lg border px-3 py-1 text-sm ${
                queuedProblemIds.includes(current.problem_id) ? "border-sky-500 bg-sky-50 text-sky-700" : "border-sky-300 text-sky-700"
              }`}
            >
              {queuedProblemIds.includes(current.problem_id) ? "수정 요청됨" : "수정"}
            </button>
            <button
              type="button"
              onClick={() => setEditingExplanation((prev) => !prev)}
              className={`rounded-lg border px-3 py-1 text-sm ${
                editingExplanation ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700"
              }`}
            >
              해설 수정
            </button>
            <button
              type="button"
              onClick={async () => {
                const next = !current.starred_at_exam_time;
                await Promise.all([setSessionItemStar(current.id, next), setProblemStar(user.id, current.problem_id, next)]);
                updateItemState(current.id, { starred_at_exam_time: next });
              }}
              className="rounded-lg border border-amber-300 px-3 py-1 text-lg leading-none text-amber-600"
            >
              {current.starred_at_exam_time ? "★" : "☆"}
            </button>
          </div>

          <h1 className="whitespace-pre-wrap text-lg font-semibold">{question.question_text}</h1>
          <ProblemImage src={question.image_url} alt="문제 이미지" className="mt-4" />

          <div className="mt-4 grid gap-2">
            {shuffledChoices.map((choice, index) => {
              const selected = selectedAnswer === choice.originalAnswer;
              const isCorrectChoice = question.correct_answer === choice.originalAnswer;
              let stateClass = "border-slate-300";

              if (!currentIsLocked && selected) {
                stateClass = "border-brand-500 bg-brand-50";
              }

              if (currentIsLocked) {
                if (selected && currentIsWrong) stateClass = "border-rose-200 bg-rose-50";
                if (selected && currentIsCorrect) stateClass = "border-emerald-200 bg-emerald-50";
                if (currentIsWrong && isCorrectChoice) stateClass = "border-emerald-200 bg-emerald-50";
              }

              return (
                <button
                  key={`${current.id}-${choice.originalAnswer}`}
                  type="button"
                  disabled={currentIsLocked}
                  onClick={() => void handleSelectAnswer(choice.originalAnswer)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition ${stateClass} disabled:cursor-not-allowed disabled:opacity-100`}
                >
                  {index + 1}. {choice.text}
                </button>
              );
            })}
          </div>

          {currentIsLocked && (
            <p className={`mt-3 text-sm ${currentIsCorrect ? "text-emerald-600" : "text-rose-600"}`}>
              {currentIsCorrect ? "정답입니다." : "오답입니다."}
            </p>
          )}

          {session.show_explanation && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setExplanationState((prev) => (prev === "idle" ? "armed" : "visible"))}
                className="rounded-lg border border-slate-300 px-3 py-1 text-xs"
              >
                해설 {explanationState === "idle" ? "(두 번 눌러 보기)" : explanationState === "armed" ? "준비됨" : "표시 중"}
              </button>
              {(explanationState === "visible" || currentIsWrong) && (
                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{question.explanation ?? "해설이 없습니다."}</p>
              )}
            </div>
          )}

          {editingExplanation && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <textarea
                value={explanationDraft}
                onChange={(e) => setExplanationDraft(e.target.value)}
                placeholder="해설을 입력하세요"
                className="min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveExplanation()}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExplanationDraft(question.explanation ?? "");
                    setEditingExplanation(false);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || selectionBusy || !currentHasSelection || currentIsLocked}
              onClick={handleInstantCheck}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              즉시 풀기
            </button>
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              이전 문제
            </button>
            <button
              type="button"
              disabled={currentIndex === items.length - 1}
              onClick={() => setCurrentIndex((prev) => Math.min(items.length - 1, prev + 1))}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              다음 문제
            </button>
          </div>
        </section>

        {navOpen && (
          <aside className="flex max-h-[75vh] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <h2 className="text-sm font-semibold">문항 이동</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-5 gap-2">
                {items.map((item, index) => {
                  let navClass = "border-slate-300 bg-white text-slate-700";
                  if (item.user_answer !== null || draftAnswers[item.id] != null) navClass = "border-slate-200 bg-slate-100 text-slate-700";
                  if (item.is_correct === true) navClass = "border-emerald-200 bg-emerald-50 text-emerald-700";
                  if (item.is_correct === false) navClass = "border-rose-200 bg-rose-50 text-rose-700";
                  if (index === currentIndex) navClass += " ring-2 ring-brand-300";

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCurrentIndex(index)}
                      className={`rounded-lg border px-2 py-2 text-xs font-semibold ${navClass}`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="border-t border-slate-200 p-4">
              <button type="button" onClick={openSubmitDialog} className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                문제 제출
              </button>
            </div>
          </aside>
        )}
      </div>

      {submitDialog !== "closed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold">문제 제출</h2>
            <p className="mt-2 text-sm text-slate-600">
              {submitDialog === "unanswered" ? `${unansweredIndexes.length}개의 문제를 안 풀었습니다. 이대로 제출하겠습니까?` : "제출하겠습니까?"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => void finalizeSession()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                예
              </button>
              {submitDialog === "unanswered" && (
                <button
                  type="button"
                  onClick={moveToFirstUnanswered}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  안 푼 문제로 이동
                </button>
              )}
              <button
                type="button"
                onClick={() => setSubmitDialog("closed")}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                아니요
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
