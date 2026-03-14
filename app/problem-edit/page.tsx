"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ProblemImage } from "@/components/problem-image";
import { dequeueProblemForEdit, getQueuedProblemIds, subscribeProblemEditQueue } from "@/lib/problem-edit-queue";
import { fetchCategories } from "@/lib/queries/categories";
import { fetchProblemsByIds, updateProblem } from "@/lib/queries/problems";
import type { CategoryRow, ProblemFormValues, ProblemWithCategory } from "@/types/problem-management";

function toFormValues(problem: ProblemWithCategory): ProblemFormValues {
  return {
    id: problem.id,
    category_id: problem.category_id,
    question_text: problem.question_text,
    image_url: problem.image_url ?? "",
    choice_1: problem.choice_1,
    choice_2: problem.choice_2,
    choice_3: problem.choice_3,
    choice_4: problem.choice_4,
    correct_answer: problem.correct_answer,
    explanation: problem.explanation ?? "",
    is_active: problem.is_active,
  };
}

export default function ProblemEditPage() {
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [problems, setProblems] = useState<ProblemWithCategory[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ProblemFormValues>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const queuedIds = getQueuedProblemIds(user.id);
    const [nextCategories, nextProblems] = await Promise.all([fetchCategories(user.id), fetchProblemsByIds(user.id, queuedIds)]);
    setCategories(nextCategories);
    setProblems(nextProblems);
    setDrafts(Object.fromEntries(nextProblems.map((problem) => [problem.id, toFormValues(problem)])));
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user?.id) return;
    return subscribeProblemEditQueue(user.id, () => {
      void load();
    });
  }, [load, user?.id]);

  if (loading || !user) {
    return <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 sm:px-6">로그인 후 사용할 수 있습니다.</main>;
  }

  const setField = <K extends keyof ProblemFormValues>(problemId: string, key: K, value: ProblemFormValues[K]) => {
    setDrafts((prev) => ({
      ...prev,
      [problemId]: {
        ...prev[problemId],
        [key]: value,
      },
    }));
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
        홈으로
      </Link>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">문제 수정</h1>
        <p className="mt-2 text-sm text-slate-600">퀴즈 도중 수정 요청한 문제를 한 번에 수정할 수 있습니다.</p>
      </section>

      <div className="mt-4 space-y-4">
        {problems.map((problem, index) => {
          const draft = drafts[problem.id];
          if (!draft) return null;

          return (
            <form
              key={problem.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await updateProblem(problem.id, draft);
                  dequeueProblemForEdit(user.id, problem.id);
                  await load();
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">수정 대상 문제 {index + 1}</h2>
                <button
                  type="button"
                  onClick={() => dequeueProblemForEdit(user.id, problem.id)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
                >
                  목록에서 제거
                </button>
              </div>

              <div className="grid gap-3">
                <select
                  value={draft.category_id ?? ""}
                  onChange={(e) => setField(problem.id, "category_id", e.target.value || null)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">카테고리 없음</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <textarea
                  required
                  value={draft.question_text}
                  onChange={(e) => setField(problem.id, "question_text", e.target.value)}
                  className="min-h-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />

                <input
                  value={draft.image_url}
                  onChange={(e) => setField(problem.id, "image_url", e.target.value)}
                  placeholder="이미지 URL"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />

                <ProblemImage src={draft.image_url} alt="문제 이미지 미리보기" />

                {(["choice_1", "choice_2", "choice_3", "choice_4"] as const).map((key, choiceIndex) => (
                  <input
                    key={key}
                    required
                    value={draft[key]}
                    onChange={(e) => setField(problem.id, key, e.target.value)}
                    placeholder={`보기 ${choiceIndex + 1}`}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                ))}

                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={draft.correct_answer}
                    onChange={(e) => setField(problem.id, "correct_answer", Number(e.target.value))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value={1}>정답 1번</option>
                    <option value={2}>정답 2번</option>
                    <option value={3}>정답 3번</option>
                    <option value={4}>정답 4번</option>
                  </select>

                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={draft.is_active}
                      onChange={(e) => setField(problem.id, "is_active", e.target.checked)}
                    />
                    활성 문제로 유지
                  </label>
                </div>

                <textarea
                  value={draft.explanation}
                  onChange={(e) => setField(problem.id, "explanation", e.target.value)}
                  placeholder="해설"
                  className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="mt-4">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  저장
                </button>
              </div>
            </form>
          );
        })}

        {problems.length === 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            수정 대기 중인 문제가 없습니다.
          </section>
        )}
      </div>
    </main>
  );
}
