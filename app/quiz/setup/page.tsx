"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { AuthFallback } from "@/components/auth-fallback";
import { fetchCategories } from "@/lib/queries/categories";
import { createQuizSession } from "@/lib/queries/quiz";
import type { CategoryRow } from "@/types/problem-management";
import type { QuizSetupValues } from "@/types/quiz";

const initialValues: QuizSetupValues = {
  selectedCategoryIds: [],
  mode: "random",
  showExplanation: true,
  questionCount: 10,
  answerMode: "instant",
};

export default function QuizSetupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [values, setValues] = useState<QuizSetupValues>(initialValues);
  const [busy, setBusy] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    setLoadingCategories(true);
    setCategoryError(null);
    fetchCategories(user.id)
      .then(setCategories)
      .catch((error) => {
        setCategories([]);
        setCategoryError(error instanceof Error ? error.message : "카테고리를 불러오지 못했습니다.");
      })
      .finally(() => setLoadingCategories(false));
  }, [user?.id]);

  if (loading || !user) {
    return (
      <AuthFallback
        loading={loading}
        isAuthenticated={Boolean(user)}
        maxWidth="max-w-3xl"
        backHref="/"
        unauthenticatedMessage="로그인 후 문제 풀이 설정을 사용할 수 있습니다."
      />
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
        홈으로
      </Link>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">문제 풀이 설정</h1>
        <p className="mt-2 text-sm text-slate-600">문제와 보기 순서는 자동으로 랜덤 출제됩니다.</p>

        <div className="mt-5 space-y-5 text-sm">
          <div>
            <p className="mb-2 font-semibold">카테고리 선택</p>
            {loadingCategories && <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">카테고리 불러오는 중...</div>}
            {categoryError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{categoryError}</div>}
            {!loadingCategories && !categoryError && categories.length === 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">등록된 카테고리가 없습니다.</div>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
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
          disabled={busy || loadingCategories}
          onClick={async () => {
            setBusy(true);
            try {
              const sessionId = await createQuizSession(user.id, values);
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
