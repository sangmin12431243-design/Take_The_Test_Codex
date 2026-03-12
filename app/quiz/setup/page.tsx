
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { fetchCategories } from "@/lib/queries/categories";
import { createQuizSession } from "@/lib/queries/quiz";
import type { CategoryRow } from "@/types/problem-management";
import type { QuizSetupValues } from "@/types/quiz";

const initialValues: QuizSetupValues = {
  selectedCategoryIds: [],
  mode: "sequential",
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

  useEffect(() => {
    if (!user?.id) return;
    fetchCategories(user.id).then(setCategories).catch(console.error);
  }, [user?.id]);

  if (loading || !user) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
          ← 첫 페이지로
        </Link>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">로그인 후 이용 가능합니다.</div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
        ← 첫 페이지로
      </Link>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">문제 풀이 설정</h1>

        <div className="mt-5 space-y-5 text-sm">
          <div>
            <p className="mb-2 font-semibold">유형 선택 (복수)</p>
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
              <span className="font-semibold">문제 순서</span>
              <select
                value={values.mode}
                onChange={(e) => setValues((prev) => ({ ...prev, mode: e.target.value as QuizSetupValues["mode"] }))}
                className="rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="sequential">sequential</option>
                <option value="random">random</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="font-semibold">해설 보기 여부</span>
              <select
                value={String(values.showExplanation)}
                onChange={(e) => setValues((prev) => ({ ...prev, showExplanation: e.target.value === "true" }))}
                className="rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="font-semibold">문제 수</span>
              <select
                value={String(values.questionCount)}
                onChange={(e) => {
                  const v = e.target.value;
                  setValues((prev) => ({ ...prev, questionCount: v === "all" ? "all" : Number(v) as 10 | 20 | 30 | 40 | 50 }));
                }}
                className="rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="30">30</option>
                <option value="40">40</option>
                <option value="50">50</option>
                <option value="all">전체</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="font-semibold">채점 방식</span>
              <select
                value={values.answerMode}
                onChange={(e) => setValues((prev) => ({ ...prev, answerMode: e.target.value as QuizSetupValues["answerMode"] }))}
                className="rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="instant">instant</option>
                <option value="final">final</option>
              </select>
            </label>
          </div>
        </div>

        <button
          type="button"
          disabled={busy}
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
          시작
        </button>
      </section>
    </main>
  );
}
