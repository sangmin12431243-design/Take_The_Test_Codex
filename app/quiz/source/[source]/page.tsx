"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { fetchCategories } from "@/lib/queries/categories";
import { fetchStarredProblems, fetchWrongNotes } from "@/lib/queries/problem-stats";
import { createSourceQuizSession } from "@/lib/queries/quiz";
import type { CategoryRow } from "@/types/problem-management";
import type { QuizSetupValues, QuizSourcePage } from "@/types/quiz";

const initialValues: QuizSetupValues = {
  selectedCategoryIds: [],
  mode: "random",
  showExplanation: true,
  questionCount: 10,
  answerMode: "instant",
};

const sourceLabels: Record<QuizSourcePage, string> = {
  wrong_note: "오답 노트",
  starred: "별표 문제",
};

export default function SourceQuizSetupPage({ params }: { params: Promise<{ source: QuizSourcePage }> }) {
  const { source } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [allowedProblemIds, setAllowedProblemIds] = useState<string[]>([]);
  const [values, setValues] = useState<QuizSetupValues>(initialValues);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      const [allCategories, sourceItems] = await Promise.all([
        fetchCategories(user.id),
        source === "wrong_note" ? fetchWrongNotes(user.id) : fetchStarredProblems(user.id),
      ]);

      const problemIds = sourceItems.map((item: any) => item.problem_id);
      const categoryIds = Array.from(new Set(sourceItems.map((item: any) => item.problems?.category_id).filter(Boolean)));
      setAllowedProblemIds(problemIds);
      setCategories(allCategories.filter((category) => categoryIds.includes(category.id)));
    };

    void load();
  }, [source, user?.id]);

  const availableCount = useMemo(() => allowedProblemIds.length, [allowedProblemIds]);

  if (loading || !user) {
    return <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8 sm:px-6">로그인 후 사용할 수 있습니다.</main>;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link href={`/${source === "wrong_note" ? "wrong-notes" : "starred"}`} className="text-sm font-semibold text-brand-700 hover:underline">
        돌아가기
      </Link>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">{sourceLabels[source]} 문제 풀이</h1>
        <p className="mt-2 text-sm text-slate-600">현재 목록 안의 문제 {availableCount}개에서만 출제됩니다.</p>

        <div className="mt-5 space-y-5 text-sm">
          <div>
            <p className="mb-2 font-semibold">카테고리 선택</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {categories.map((category) => {
                const checked = values.selectedCategoryIds.includes(category.id);
                return (
                  <label key={category.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setValues((prev) => ({
                          ...prev,
                          selectedCategoryIds: e.target.checked
                            ? [...prev.selectedCategoryIds, category.id]
                            : prev.selectedCategoryIds.filter((id) => id !== category.id),
                        }));
                      }}
                    />
                    {category.name}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="font-semibold">해설 표시</span>
              <select
                value={String(values.showExplanation)}
                onChange={(e) => setValues((prev) => ({ ...prev, showExplanation: e.target.value === "true" }))}
                className="rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="true">표시</option>
                <option value="false">숨기기</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="font-semibold">문제 수</span>
              <select
                value={String(values.questionCount)}
                onChange={(e) => {
                  const value = e.target.value;
                  setValues((prev) => ({ ...prev, questionCount: value === "all" ? "all" : (Number(value) as 10 | 20 | 30 | 40 | 50) }));
                }}
                className="rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="10">10문제</option>
                <option value="20">20문제</option>
                <option value="30">30문제</option>
                <option value="40">40문제</option>
                <option value="50">50문제</option>
                <option value="all">전체</option>
              </select>
            </label>
          </div>
        </div>

        <button
          type="button"
          disabled={busy || allowedProblemIds.length === 0}
          onClick={async () => {
            setBusy(true);
            try {
              const sessionId = await createSourceQuizSession(user.id, values, source, allowedProblemIds);
              router.push(`/quiz/play/${sessionId}`);
            } finally {
              setBusy(false);
            }
          }}
          className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          시작하기
        </button>
      </section>
    </main>
  );
}
