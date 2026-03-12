"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { CategoryManager } from "@/components/problems/category-manager";
import { ProblemCsvUpload } from "@/components/problems/problem-csv-upload";
import { ProblemFiltersBar } from "@/components/problems/problem-filters";
import { ProblemForm } from "@/components/problems/problem-form";
import { ProblemList } from "@/components/problems/problem-list";
import { createCategory, fetchCategories } from "@/lib/queries/categories";
import { createProblem, deactivateProblem, fetchProblems, updateProblem } from "@/lib/queries/problems";
import type { ProblemFilters, ProblemFormValues, ProblemWithCategory } from "@/types/problem-management";
import type { CategoryRow } from "@/types/problem-management";
import type { ProblemsTab } from "@/types/problem-csv";

const initialFilters: ProblemFilters = {
  categoryId: "",
  difficulty: "all",
  active: "all",
  keyword: "",
};

function toFormValues(problem: ProblemWithCategory): ProblemFormValues {
  return {
    id: problem.id,
    category_id: problem.category_id,
    question_text: problem.question_text,
    choice_1: problem.choice_1,
    choice_2: problem.choice_2,
    choice_3: problem.choice_3,
    choice_4: problem.choice_4,
    correct_answer: problem.correct_answer,
    explanation: problem.explanation ?? "",
    difficulty: problem.difficulty,
    order_index: problem.order_index,
    is_active: problem.is_active,
  };
}

export default function ProblemsPage() {
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [problems, setProblems] = useState<ProblemWithCategory[]>([]);
  const [filters, setFilters] = useState<ProblemFilters>(initialFilters);
  const [editing, setEditing] = useState<ProblemWithCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProblemsTab>("single");

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    return "문제를 처리하는 중 오류가 발생했습니다.";
  };

  const runMutation = async (action: () => Promise<void>) => {
    setBusy(true);
    setErrorMessage(null);
    try {
      await action();
      return true;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const loadAll = useCallback(async () => {
    if (!user?.id) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const [nextCategories, nextProblems] = await Promise.all([fetchCategories(user.id), fetchProblems(user.id, filters)]);
      setCategories(nextCategories);
      setProblems(nextProblems);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "데이터 조회 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }, [user?.id, filters]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const isAuthReady = useMemo(() => !loading && Boolean(user), [loading, user]);

  if (!isAuthReady || !user) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
        <div className="mb-6">
          <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
            ← 첫 페이지로
          </Link>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">문제 관리</h1>
          <p className="mt-2 text-sm text-slate-600">로그인 후 본인 문제를 관리할 수 있습니다.</p>
        </section>
      </main>
    );
  }

  const userId = user.id;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6">
      <div>
        <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
          ← 첫 페이지로
        </Link>
      </div>

      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">문제 관리</h1>
        <p className="mt-2 text-sm text-slate-600">로그인 사용자 본인의 문제만 조회/추가/수정/비활성화할 수 있습니다.</p>
      </header>

      <CategoryManager
        categories={categories}
        onCreate={async (name) => {
          return runMutation(async () => {
            await createCategory(userId, name);
            await loadAll();
          });
        }}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("single")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              activeTab === "single" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            단일 추가
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("csv")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              activeTab === "csv" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            CSV 업로드
          </button>
        </div>
      </section>

      {activeTab === "single" ? (
        <ProblemForm
          categories={categories}
          initialValues={editing ? toFormValues(editing) : null}
          onCancelEdit={() => setEditing(null)}
          onSubmit={async (values) => {
            return runMutation(async () => {
              if (editing?.id) {
                await updateProblem(editing.id, values);
                setEditing(null);
              } else {
                await createProblem(userId, values);
              }
              await loadAll();
            });
          }}
        />
      ) : (
        <ProblemCsvUpload userId={userId} categories={categories} onUploaded={loadAll} />
      )}

      <ProblemFiltersBar categories={categories} filters={filters} onChange={setFilters} />

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
      )}

      {busy ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">데이터를 불러오는 중...</div>
      ) : (
        <ProblemList
          problems={problems}

          onEdit={(problem) => {
            setEditing(problem);
            setActiveTab("single");
          }}
          onDeactivate={async (problemId) => {
            await runMutation(async () => {
              await deactivateProblem(problemId);
              if (editing?.id === problemId) setEditing(null);
              await loadAll();
            });
          }}
        />
      )}
    </main>
  );
}
