"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { AuthFallback } from "@/components/auth-fallback";
import { ProblemFiltersBar } from "@/components/problems/problem-filters";
import { ProblemList } from "@/components/problems/problem-list";
import { fetchCategories } from "@/lib/queries/categories";
import { deleteProblem, deleteProblems, fetchProblems, updateProblem } from "@/lib/queries/problems";
import { setProblemStar } from "@/lib/queries/quiz";
import type { CategoryRow, ProblemFilters, ProblemWithCategory } from "@/types/problem-management";

const initialFilters: ProblemFilters = {
  categoryId: "",
  active: "all",
  starred: "all",
  keyword: "",
  sort: "latest",
};

const topLinkClass = "rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100";

export default function ProblemsListPage() {
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [problems, setProblems] = useState<ProblemWithCategory[]>([]);
  const [filters, setFilters] = useState<ProblemFilters>(initialFilters);
  const [editing, setEditing] = useState<ProblemWithCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deferredKeyword = useDeferredValue(filters.keyword);
  const effectiveFilters = useMemo(
    () => ({
      ...filters,
      keyword: deferredKeyword,
    }),
    [deferredKeyword, filters],
  );

  const load = useCallback(async () => {
    if (!user?.id) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const [nextCategories, nextProblems] = await Promise.all([fetchCategories(user.id), fetchProblems(user.id, effectiveFilters)]);
      setCategories(nextCategories);
      setProblems(nextProblems);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "문제 목록을 불러오지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }, [effectiveFilters, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !user) {
    return <AuthFallback loading={loading} isAuthenticated={Boolean(user)} maxWidth="max-w-5xl" />;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className={topLinkClass}>
          홈으로
        </Link>
        <Link href="/problems" className={topLinkClass}>
          문제 추가
        </Link>
      </div>

      <div className="mt-4">
        <ProblemFiltersBar categories={categories} filters={filters} onChange={setFilters} />
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
      )}

      <div className="mt-4">
        {busy ? (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">불러오는 중...</div>
        ) : (
          <ProblemList
            categories={categories}
            problems={problems}
            editingProblem={editing}
            onEdit={setEditing}
            onUpdate={async (problemId, values) => {
              await updateProblem(problemId, values);
              setEditing(null);
              await load();
            }}
            onDelete={async (problemId) => {
              await deleteProblem(problemId);
              if (editing?.id === problemId) setEditing(null);
              await load();
            }}
            onDeleteSelected={async (problemIds) => {
              await deleteProblems(problemIds);
              if (editing && problemIds.includes(editing.id)) {
                setEditing(null);
              }
              await load();
            }}
            onToggleStar={async (problemId, starred) => {
              await setProblemStar(user.id, problemId, starred);
              await load();
            }}
          />
        )}
      </div>
    </main>
  );
}
