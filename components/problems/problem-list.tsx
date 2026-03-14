"use client";

import { useEffect, useMemo, useState } from "react";
import { ProblemImage } from "@/components/problem-image";
import type { CategoryRow, ProblemFormValues, ProblemWithCategory } from "@/types/problem-management";

interface Props {
  categories: CategoryRow[];
  problems: ProblemWithCategory[];
  editingProblem: ProblemWithCategory | null;
  onEdit: (problem: ProblemWithCategory | null) => void;
  onUpdate: (problemId: string, values: ProblemFormValues) => Promise<void>;
  onDelete: (problemId: string) => Promise<void>;
  onToggleStar: (problemId: string, starred: boolean) => Promise<void>;
}

const PAGE_SIZE = 10;

function getPageNumbers(currentPage: number, totalPages: number) {
  const start = Math.floor((currentPage - 1) / 10) * 10 + 1;
  const end = Math.min(totalPages, start + 9);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function toFormValues(problem: ProblemWithCategory): ProblemFormValues {
  return {
    id: problem.id,
    category_id: problem.category_id,
    question_text: problem.question_text,
    image_url: problem.image_url ?? "",
    choice_1: problem.choice_1,
    choice_2: problem.choice_2,
    choice_3: problem.choice_3,
    choice_4: problem.choice_4,
    correct_answer: problem.correct_answer,
    explanation: problem.explanation ?? "",
    is_active: problem.is_active,
  };
}

export function ProblemList({ categories, problems, editingProblem, onEdit, onUpdate, onDelete, onToggleStar }: Props) {
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<ProblemFormValues | null>(editingProblem ? toFormValues(editingProblem) : null);

  const totalPages = Math.max(1, Math.ceil(problems.length / PAGE_SIZE));
  const pagedProblems = useMemo(() => problems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [page, problems]);
  const pageNumbers = useMemo(() => getPageNumbers(page, totalPages), [page, totalPages]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setDraft(editingProblem ? toFormValues(editingProblem) : null);
  }, [editingProblem]);

  const setField = <K extends keyof ProblemFormValues>(key: K, value: ProblemFormValues[K]) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">문제 목록</h2>
        <span className="text-xs text-slate-500">
          총 {problems.length}개 · {page}/{totalPages} 페이지
        </span>
      </div>

      <div className="space-y-3">
        {pagedProblems.map((problem) => {
          const expanded = editingProblem?.id === problem.id && draft;
          return (
            <article key={problem.id} className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="flex items-start gap-3 p-4">
                <button
                  type="button"
                  onClick={() => void onToggleStar(problem.id, !problem.starred)}
                  className={`mt-0.5 text-xl leading-none ${problem.starred ? "text-amber-500" : "text-slate-300"}`}
                  aria-label={problem.starred ? "별표 해제" : "별표"}
                >
                  {problem.starred ? "★" : "☆"}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{problem.question_text}</p>
                      <ProblemImage src={problem.image_url} alt="문제 이미지" className="mt-3 max-w-xl" />
                      <p className="mt-1 text-xs text-slate-500">
                        카테고리: {problem.categories?.name ?? "미분류"} · 상태: {problem.is_active ? "활성" : "비활성"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(expanded ? null : problem)}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDelete(problem.id)}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-600"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`grid transition-all duration-300 ease-out ${
                  expanded ? "grid-rows-[1fr] border-t border-slate-200" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  {expanded && draft && (
                    <form
                      className="grid gap-3 bg-slate-50 p-4"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await onUpdate(problem.id, draft);
                        onEdit(null);
                      }}
                    >
                      <select
                        value={draft.category_id ?? ""}
                        onChange={(e) => setField("category_id", e.target.value || null)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="">카테고리 없음</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>

                      <textarea
                        required
                        value={draft.question_text}
                        onChange={(e) => setField("question_text", e.target.value)}
                        className="min-h-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />

                      <input
                        value={draft.image_url}
                        onChange={(e) => setField("image_url", e.target.value)}
                        placeholder="이미지 URL"
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />

                      <ProblemImage src={draft.image_url} alt="문제 이미지 미리보기" />

                      {(["choice_1", "choice_2", "choice_3", "choice_4"] as const).map((key, index) => (
                        <input
                          key={key}
                          required
                          value={draft[key]}
                          onChange={(e) => setField(key, e.target.value)}
                          placeholder={`보기 ${index + 1}`}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      ))}

                      <div className="grid gap-3 sm:grid-cols-2">
                        <select
                          value={draft.correct_answer}
                          onChange={(e) => setField("correct_answer", Number(e.target.value))}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                          <option value={1}>정답 1번</option>
                          <option value={2}>정답 2번</option>
                          <option value={3}>정답 3번</option>
                          <option value={4}>정답 4번</option>
                        </select>

                        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={draft.is_active}
                            onChange={(e) => setField("is_active", e.target.checked)}
                          />
                          활성 문제로 등록
                        </label>
                      </div>

                      <textarea
                        value={draft.explanation}
                        onChange={(e) => setField("explanation", e.target.value)}
                        placeholder="해설"
                        className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />

                      <div className="flex gap-2">
                        <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit(null)}
                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                        >
                          취소
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
        >
          이전
        </button>
        <div className="flex flex-wrap items-center justify-center gap-1">
          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => setPage(pageNumber)}
              className={`min-w-9 rounded-lg px-3 py-2 text-sm ${
                page === pageNumber ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700"
              }`}
            >
              {pageNumber}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
        >
          다음
        </button>
      </div>
    </section>
  );
}
