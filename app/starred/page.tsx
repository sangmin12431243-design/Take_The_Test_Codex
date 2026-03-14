"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ProblemReviewList } from "@/components/problem-review-list";
import { fetchStarredProblems } from "@/lib/queries/problem-stats";
import { setProblemStar } from "@/lib/queries/quiz";

export default function StarredPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    fetchStarredProblems(user.id).then(setItems).catch(console.error);
  }, [user?.id]);

  if (loading || !user) {
    return <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 sm:px-6">로그인 후 사용할 수 있습니다.</main>;
  }

  const load = async () => {
    const nextItems = await fetchStarredProblems(user.id);
    setItems(nextItems);
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
          홈으로
        </Link>
        <Link href="/quiz/source/starred" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          문제 풀기
        </Link>
      </div>
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">별표 문제</h1>
        <div className="mt-4">
          <ProblemReviewList
            items={items}
            emptyMessage="별표한 문제가 없습니다."
            onRemove={async (item) => {
              await setProblemStar(user.id, item.problem_id, false);
              await load();
            }}
          />
        </div>
      </section>
    </main>
  );
}
