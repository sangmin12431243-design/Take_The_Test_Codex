"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { fetchWrongNotes, updateMastered } from "@/lib/queries/problem-stats";

export default function WrongNotesPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [sort, setSort] = useState<"wrong_desc" | "wrong_asc">("wrong_desc");
  const [showMastered, setShowMastered] = useState(true);
  const [masteredBottom, setMasteredBottom] = useState(true);

  const load = async () => {
    if (!user?.id) return;
    const data = await fetchWrongNotes(user.id);
    setItems(data);
  };

  useEffect(() => {
    void load();
  }, [user?.id]);

  const viewItems = useMemo(() => {
    let next = [...items];
    if (!showMastered) next = next.filter((item) => !item.mastered);

    next.sort((a, b) => (sort === "wrong_desc" ? b.wrong_count - a.wrong_count : a.wrong_count - b.wrong_count));

    if (masteredBottom) {
      next.sort((a, b) => Number(a.mastered) - Number(b.mastered));
    }

    return next;
  }, [items, masteredBottom, showMastered, sort]);

  if (loading || !user) {
    return <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 sm:px-6">로그인 후 이용 가능합니다.</main>;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
        ← 첫 페이지로
      </Link>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">오답노트</h1>

        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="rounded-lg border border-slate-300 px-3 py-2">
            <option value="wrong_desc">많이 틀린 순</option>
            <option value="wrong_asc">적게 틀린 순</option>
          </select>

          <select
            value={showMastered ? "show" : "hide"}
            onChange={(e) => setShowMastered(e.target.value === "show")}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="show">숙지 문제 보기</option>
            <option value="hide">숙지 문제 숨기기</option>
          </select>

          <select
            value={masteredBottom ? "bottom" : "mixed"}
            onChange={(e) => setMasteredBottom(e.target.value === "bottom")}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="bottom">숙지 문제 맨 밑으로</option>
            <option value="mixed">숙지 문제 섞어서 보기</option>
          </select>
        </div>

        <div className="mt-5 space-y-2">
          {viewItems.map((item) => {
            const accuracy = item.total_solved_count > 0 ? ((item.correct_count / item.total_solved_count) * 100).toFixed(1) : "0.0";
            return (
              <article key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium">{item.problems?.question_text}</p>
                <p className="mt-1 text-slate-600">
                  틀린 횟수: {item.wrong_count} · 정답률: {accuracy}%
                </p>
                <label className="mt-2 flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={item.mastered}
                    onChange={async (e) => {
                      await updateMastered(item.id, e.target.checked);
                      await load();
                    }}
                  />
                  숙지 체크
                </label>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
