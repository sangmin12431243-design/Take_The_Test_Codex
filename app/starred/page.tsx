"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { fetchStarredProblems } from "@/lib/queries/problem-stats";

function difficultyLabel(value?: string | null) {
  if (value === "easy") return "쉬움";
  if (value === "medium") return "보통";
  if (value === "hard") return "어려움";
  return "-";
}

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

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
        홈으로
      </Link>
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">별표 문제</h1>
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <p className="font-medium">{item.problems?.question_text}</p>
              <p className="mt-1 text-slate-600">
                난이도: {difficultyLabel(item.problems?.difficulty)} · 순서: {item.problems?.order_index}
              </p>
            </article>
          ))}
          {items.length === 0 && <p className="text-sm text-slate-500">별표한 문제가 없습니다.</p>}
        </div>
      </section>
    </main>
  );
}
