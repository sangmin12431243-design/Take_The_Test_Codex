"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { AuthFallback } from "@/components/auth-fallback";
import { ProblemReviewList } from "@/components/problem-review-list";
import { fetchCategories } from "@/lib/queries/categories";
import { clearWrongNote, fetchWrongNotes, updateMastered } from "@/lib/queries/problem-stats";
import { setProblemStar } from "@/lib/queries/quiz";

type SortMode = "wrong_desc" | "wrong_asc";
type MasteredVisibility = "show" | "hide";
type MasteredPlacement = "bottom" | "mixed";

const filterClass =
  "h-11 rounded-full border border-slate-200 bg-slate-100 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white";

export default function WrongNotesPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [sort, setSort] = useState<SortMode>("wrong_desc");
  const [masteredVisibility, setMasteredVisibility] = useState<MasteredVisibility>("show");
  const [masteredPlacement, setMasteredPlacement] = useState<MasteredPlacement>("bottom");
  const [categoryId, setCategoryId] = useState("");

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [wrongNotes, categoryRows] = await Promise.all([fetchWrongNotes(user.id), fetchCategories(user.id)]);
    setItems(wrongNotes);
    setCategories(categoryRows);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);

  const viewItems = useMemo(() => {
    let next = [...items];

    if (categoryId) {
      next = next.filter((item) => item.problems?.category_id === categoryId);
    }

    if (masteredVisibility === "hide") {
      next = next.filter((item) => !item.mastered);
    }

    next.sort((a, b) => (sort === "wrong_desc" ? b.wrong_count - a.wrong_count : a.wrong_count - b.wrong_count));

    if (masteredPlacement === "bottom") {
      next.sort((a, b) => Number(a.mastered) - Number(b.mastered));
    }

    return next;
  }, [categoryId, items, masteredPlacement, masteredVisibility, sort]);

  if (loading || !user) {
    return <AuthFallback loading={loading} isAuthenticated={Boolean(user)} maxWidth="max-w-5xl" />;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
          홈으로
        </Link>
        <Link href="/quiz/source/wrong_note" className="rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-slate-900">
          오답 문제 다시 풀기
        </Link>
      </div>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">오답 노트</h1>

        <div className="mt-4 flex flex-nowrap items-center gap-2 overflow-x-auto">
          <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)} className={`${filterClass} min-w-[130px] flex-none`}>
            <option value="wrong_desc">오답 많은 순</option>
            <option value="wrong_asc">오답 적은 순</option>
          </select>
          <select
            value={masteredVisibility}
            onChange={(e) => setMasteredVisibility(e.target.value as MasteredVisibility)}
            className={`${filterClass} min-w-[130px] flex-none`}
          >
            <option value="show">숙달 보이기</option>
            <option value="hide">숙달 숨기기</option>
          </select>
          <select
            value={masteredPlacement}
            onChange={(e) => setMasteredPlacement(e.target.value as MasteredPlacement)}
            className={`${filterClass} min-w-[140px] flex-none`}
          >
            <option value="bottom">숙달 맨 끝</option>
            <option value="mixed">숙달 섞어보기</option>
          </select>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={`${filterClass} min-w-[150px] flex-none`}>
            <option value="">전체 카테고리</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5">
          <ProblemReviewList
            items={viewItems}
            emptyMessage="오답 문제가 없습니다."
            renderTopMeta={(item) => (
              <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {categoryMap.get(item.problems?.category_id ?? "") ?? "카테고리 없음"}
              </div>
            )}
            renderQuestionPrefix={(item) => (
              <button
                type="button"
                onClick={async () => {
                  await setProblemStar(user.id, item.problem_id, !item.starred);
                  await load();
                }}
                className={`text-2xl leading-none ${item.starred ? "text-amber-500" : "text-slate-300"}`}
                aria-label={item.starred ? "별표 해제" : "별표"}
              >
                {item.starred ? "★" : "☆"}
              </button>
            )}
            renderMeta={(item) => {
              const accuracy = item.total_solved_count > 0 ? ((item.correct_count / item.total_solved_count) * 100).toFixed(1) : "0.0";
              return (
                <div className="flex flex-wrap items-center gap-3">
                  <span>오답 횟수: {item.wrong_count}</span>
                  <span>정답률: {accuracy}%</span>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.mastered}
                      onChange={async (e) => {
                        await updateMastered(item.id, e.target.checked);
                        await load();
                      }}
                    />
                    숙달 체크
                  </label>
                </div>
              );
            }}
            onRemove={async (item) => {
              await clearWrongNote(item.id);
              await load();
            }}
          />
        </div>
      </section>
    </main>
  );
}
