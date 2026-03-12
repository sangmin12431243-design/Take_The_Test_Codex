"use client";

import type { ProblemWithCategory } from "@/types/problem-management";

interface Props {
  problems: ProblemWithCategory[];
  onEdit: (problem: ProblemWithCategory) => void;
  onDeactivate: (problemId: string) => Promise<void>;
}

export function ProblemList({ problems, onEdit, onDeactivate }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">문제 목록</h2>
        <span className="text-xs text-slate-500">총 {problems.length}개</span>
      </div>

      <div className="space-y-3 lg:hidden">
        {problems.map((problem) => (
          <article key={problem.id} className="rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-medium">{problem.question_text}</p>
            <p className="mt-1 text-xs text-slate-500">
              카테고리: {problem.categories?.name ?? "미지정"} · 난이도: {problem.difficulty} · 상태: {problem.is_active ? "활성" : "비활성"}
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => onEdit(problem)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white">
                수정
              </button>
              {problem.is_active && (
                <button
                  onClick={() => onDeactivate(problem.id)}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-600"
                >
                  비활성화
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="py-2">순서</th>
              <th>문제</th>
              <th>카테고리</th>
              <th>난이도</th>
              <th>상태</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {problems.map((problem) => (
              <tr key={problem.id} className="border-b border-slate-100 align-top">
                <td className="py-3">{problem.order_index}</td>
                <td className="py-3">{problem.question_text}</td>
                <td className="py-3">{problem.categories?.name ?? "미지정"}</td>
                <td className="py-3">{problem.difficulty}</td>
                <td className="py-3">{problem.is_active ? "활성" : "비활성"}</td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <button onClick={() => onEdit(problem)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white">
                      수정
                    </button>
                    {problem.is_active && (
                      <button
                        onClick={() => onDeactivate(problem.id)}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-600"
                      >
                        비활성화
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
