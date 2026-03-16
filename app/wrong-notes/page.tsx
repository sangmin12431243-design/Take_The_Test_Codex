"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { AuthFallback } from "@/components/auth-fallback";
import { ProblemReviewList } from "@/components/problem-review-list";
import { clearWrongNote, fetchWrongNotes, updateMastered } from "@/lib/queries/problem-stats";
import { setProblemStar } from "@/lib/queries/quiz";

export default function WrongNotesPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [sort, setSort] = useState<"wrong_desc" | "wrong_asc">("wrong_desc");
  const [showMastered, setShowMastered] = useState(true);
  const [masteredBottom, setMasteredBottom] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const data = await fetchWrongNotes(user.id);
    setItems(data);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const viewItems = useMemo(() => {
    let next = [...items];
    if (!showMastered) next = next.filter((item) => !item.mastered);
    next.sort((a, b) => (sort === "wrong_desc" ? b.wrong_count - a.wrong_count : a.wrong_count - b.wrong_count));
    if (masteredBottom) next.sort((a, b) => Number(a.mastered) - Number(b.mastered));
    return next;
  }, [items, masteredBottom, showMastered, sort]);

  if (loading || !user) {
    return <AuthFallback loading={loading} isAuthenticated={Boolean(user)} maxWidth="max-w-4xl" />;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
          홈으로
        </Link>
        <Link href="/quiz/source/wrong_note" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          문제 풀기
        </Link>
      </div>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">오답 노트</h1>

        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "wrong_desc" | "wrong_asc")}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="wrong_desc">오답 많은 순</option>
            <option value="wrong_asc">오답 적은 순</option>
          </select>
          <select
            value={showMastered ? "show" : "hide"}
            onChange={(e) => setShowMastered(e.target.value === "show")}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="show">숙달 문제 보기</option>
            <option value="hide">숙달 문제 숨기기</option>
          </select>
          <select
            value={masteredBottom ? "bottom" : "mixed"}
            onChange={(e) => setMasteredBottom(e.target.value === "bottom")}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="bottom">숙달 문제 아래로 보내기</option>
            <option value="mixed">숙달 문제 함께 보기</option>
          </select>
        </div>

        <div className="mt-5">
          <ProblemReviewList
            items={viewItems}
            emptyMessage="오답 문제가 없습니다."
            renderMeta={(item) => {
              const accuracy = item.total_solved_count > 0 ? ((item.correct_count / item.total_solved_count) * 100).toFixed(1) : "0.0";
              return (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      await setProblemStar(user.id, item.problem_id, !item.starred);
                      await load();
                    }}
                    className={`text-xl leading-none ${item.starred ? "text-amber-500" : "text-slate-300"}`}
                    aria-label={item.starred ? "별표 해제" : "별표"}
                  >
                    {item.starred ? "★" : "☆"}
                  </button>
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
