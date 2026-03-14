"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ProblemImage } from "@/components/problem-image";
import { dequeueProblemForEdit, getQueuedProblemIds, queueProblemForEdit, subscribeProblemEditQueue } from "@/lib/problem-edit-queue";
import { updateProblemExplanation } from "@/lib/queries/problems";
import { fetchSession, setProblemStar, type SessionWithItems } from "@/lib/queries/quiz";

const PAGE_SIZE = 5;

function getPageNumbers(currentPage: number, totalPages: number) {
  const start = Math.floor((currentPage - 1) / 10) * 10 + 1;
  const end = Math.min(totalPages, start + 9);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function formatDuration(startedAt: string, finishedAt: string | null) {
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt ?? startedAt).getTime();
  const diff = Math.max(0, Math.floor((end - start) / 1000));
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  if (hours > 0) return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function QuizResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const [session, setSession] = useState<SessionWithItems | null>(null);
  const [queuedProblemIds, setQueuedProblemIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [editingProblemId, setEditingProblemId] = useState<string | null>(null);
  const [explanationDraft, setExplanationDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchSession(id).then(setSession).catch(console.error);
  }, [id]);

  useEffect(() => {
    if (!user?.id) return;
    const sync = () => setQueuedProblemIds(getQueuedProblemIds(user.id));
    sync();
    return subscribeProblemEditQueue(user.id, sync);
  }, [user?.id]);

  const items = useMemo(
    () => [...(session?.quiz_session_items ?? [])].sort((a, b) => a.shown_order - b.shown_order),
    [session?.quiz_session_items],
  );
  const wrongItems = useMemo(() => items.filter((item) => item.user_answer !== null && item.is_correct === false), [items]);
  const totalPages = Math.max(1, Math.ceil(wrongItems.length / PAGE_SIZE));
  const pagedWrongItems = useMemo(() => wrongItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [page, wrongItems]);
  const pageNumbers = useMemo(() => getPageNumbers(page, totalPages), [page, totalPages]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (loading || !user || !session) {
    return <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6">불러오는 중...</main>;
  }

  const correctCount = items.filter((item) => item.is_correct).length;
  const wrongCount = wrongItems.length;
  const total = session.question_count;
  const score = session.score ?? (total > 0 ? Number(((correctCount / total) * 100).toFixed(2)) : 0);
  const duration = formatDuration(session.started_at, session.finished_at);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
        홈으로
      </Link>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-bold">결과</h1>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-500">점수</p>
            <p className="text-4xl font-extrabold text-brand-600">{score}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3">총 문제 수 {total}</div>
          <div className="rounded-lg bg-slate-50 p-3">정답 수 {correctCount}</div>
          <div className="rounded-lg bg-slate-50 p-3">오답 수 {wrongCount}</div>
          <div className="rounded-lg bg-slate-50 p-3">풀이 시간 {duration}</div>
        </div>

        <h2 className="mt-6 text-lg font-semibold">틀린 문제</h2>
        <div className="mt-3 space-y-3">
          {wrongItems.length === 0 && <p className="text-sm text-slate-500">틀린 문제가 없습니다.</p>}
          {pagedWrongItems.map((item, index) => {
            const choices = [item.problems.choice_1, item.problems.choice_2, item.problems.choice_3, item.problems.choice_4];
            const isQueued = queuedProblemIds.includes(item.problem_id);
            const isEditing = editingProblemId === item.problem_id;

            return (
              <article key={item.id} className="rounded-2xl border border-slate-200 p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {(page - 1) * PAGE_SIZE + index + 1}. {item.problems.question_text}
                    </p>
                    <ProblemImage src={item.problems.image_url} alt="문제 이미지" className="mt-3 max-w-xl" />
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isQueued) {
                          dequeueProblemForEdit(user.id, item.problem_id);
                          setQueuedProblemIds((prev) => prev.filter((problemId) => problemId !== item.problem_id));
                          return;
                        }
                        queueProblemForEdit(user.id, item.problem_id);
                        setQueuedProblemIds((prev) => (prev.includes(item.problem_id) ? prev : [...prev, item.problem_id]));
                      }}
                      className={`rounded-lg border px-3 py-1 text-xs ${isQueued ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-300 text-slate-700"}`}
                    >
                      {isQueued ? "수정 요청됨" : "수정"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProblemId(isEditing ? null : item.problem_id);
                        setExplanationDraft(item.problems.explanation ?? "");
                      }}
                      className={`rounded-lg border px-3 py-1 text-xs ${isEditing ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700"}`}
                    >
                      해설 수정
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const next = !item.starred_at_exam_time;
                        await setProblemStar(user.id, item.problem_id, next);
                        setSession((prev) =>
                          prev
                            ? {
                                ...prev,
                                quiz_session_items: prev.quiz_session_items.map((sessionItem) =>
                                  sessionItem.id === item.id ? { ...sessionItem, starred_at_exam_time: next } : sessionItem,
                                ),
                              }
                            : prev,
                        );
                      }}
                      className="text-xl leading-none text-amber-500"
                    >
                      {item.starred_at_exam_time ? "★" : "☆"}
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-2">
                  {choices.map((choice, choiceIndex) => {
                    const answerNumber = choiceIndex + 1;
                    const isUserAnswer = item.user_answer === answerNumber;
                    const isCorrectAnswer = item.problems.correct_answer === answerNumber;
                    const tone = isCorrectAnswer
                      ? "border-emerald-200 bg-emerald-50"
                      : isUserAnswer
                        ? "border-rose-200 bg-rose-50"
                        : "border-slate-200 bg-slate-50";

                    return (
                      <div key={answerNumber} className={`rounded-lg border px-3 py-2 ${tone}`}>
                        {answerNumber}. {choice}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-slate-700">
                  <p>내 답: {item.user_answer}</p>
                  <p>정답: {item.problems.correct_answer}</p>
                </div>

                <div className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-700">
                  {item.problems.explanation ?? "해설이 없습니다."}
                </div>

                {isEditing && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
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
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await updateProblemExplanation(item.problem_id, explanationDraft);
                            setSession((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    quiz_session_items: prev.quiz_session_items.map((sessionItem) =>
                                      sessionItem.id === item.id
                                        ? {
                                            ...sessionItem,
                                            problems: {
                                              ...sessionItem.problems,
                                              explanation: explanationDraft || null,
                                            },
                                          }
                                        : sessionItem,
                                    ),
                                  }
                                : prev,
                            );
                            setEditingProblemId(null);
                          } finally {
                            setBusy(false);
                          }
                        }}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExplanationDraft(item.problems.explanation ?? "");
                          setEditingProblemId(null);
                        }}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {wrongItems.length > PAGE_SIZE && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
            >
              이전
            </button>
            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={`min-w-9 rounded-lg px-3 py-2 text-sm ${
                  page === pageNumber ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700"
                }`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
            >
              다음
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
