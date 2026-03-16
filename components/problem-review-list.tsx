"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ProblemImage } from "@/components/problem-image";

interface ProblemData {
  id: string;
  question_text: string;
  image_url: string | null;
  choice_1: string;
  choice_2: string;
  choice_3: string;
  choice_4: string;
  correct_answer: number;
  explanation: string | null;
}

interface ReviewItem {
  id: string;
  problem_id: string;
  problems: ProblemData | null;
}

interface Props<T extends ReviewItem> {
  items: T[];
  emptyMessage: string;
  renderMeta?: (item: T) => ReactNode;
  renderTopMeta?: (item: T) => ReactNode;
  renderQuestionPrefix?: (item: T) => ReactNode;
  renderSideAction?: (item: T) => ReactNode;
  onRemove?: (item: T) => Promise<void>;
}

const PAGE_SIZE = 10;

function getPageNumbers(currentPage: number, totalPages: number) {
  const start = Math.floor((currentPage - 1) / 10) * 10 + 1;
  const end = Math.min(totalPages, start + 9);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function ProblemReviewList<T extends ReviewItem>({
  items,
  emptyMessage,
  renderMeta,
  renderTopMeta,
  renderQuestionPrefix,
  renderSideAction,
  onRemove,
}: Props<T>) {
  const [page, setPage] = useState(1);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number | null>>({});
  const [answerVisible, setAnswerVisible] = useState<Record<string, boolean>>({});
  const [explanationState, setExplanationState] = useState<Record<string, 0 | 1 | 2>>({});

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pagedItems = useMemo(() => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [items, page]);
  const pageNumbers = useMemo(() => getPageNumbers(page, totalPages), [page, totalPages]);

  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {pagedItems.map((item, index) => {
        const problem = item.problems;
        if (!problem) return null;

        const explanationViewState = explanationState[item.id] ?? 0;
        const selectedAnswer = selectedAnswers[item.id] ?? null;
        const isAnswerVisible = answerVisible[item.id] ?? false;
        const choices = [problem.choice_1, problem.choice_2, problem.choice_3, problem.choice_4];

        return (
          <article key={item.id} className="rounded-lg border border-slate-200 p-4 text-sm">
            {renderTopMeta && <div className="mb-2">{renderTopMeta(item)}</div>}

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  {renderQuestionPrefix && <div className="pt-0.5">{renderQuestionPrefix(item)}</div>}
                  <p className="whitespace-pre-wrap font-medium">
                    {(page - 1) * PAGE_SIZE + index + 1}. {problem.question_text}
                  </p>
                </div>
                <ProblemImage src={problem.image_url} alt="문제 이미지" className="mt-3 max-w-xl" />
                {renderMeta && <div className="mt-2 text-slate-600">{renderMeta(item)}</div>}
              </div>

              {renderSideAction ? (
                <div className="shrink-0">{renderSideAction(item)}</div>
              ) : (
                onRemove && (
                  <button
                    type="button"
                    onClick={async () => {
                      const confirmed = window.confirm("정말 이 항목을 목록에서 제거하시겠습니까?");
                      if (!confirmed) return;
                      await onRemove(item);
                    }}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-600"
                  >
                    없애기
                  </button>
                )
              )}
            </div>

            <div className="mt-3 grid gap-2">
              {choices.map((choice, choiceIndex) => {
                const answerNumber = choiceIndex + 1;
                const isSelected = selectedAnswer === answerNumber;
                const isCorrect = problem.correct_answer === answerNumber;

                let colorClass = "border-slate-200 bg-slate-50";
                if (!isAnswerVisible && isSelected) {
                  colorClass = "border-brand-300 bg-brand-50";
                }
                if (isAnswerVisible) {
                  if (selectedAnswer === null && isCorrect) {
                    colorClass = "border-emerald-200 bg-emerald-50";
                  } else if (selectedAnswer === answerNumber && isCorrect) {
                    colorClass = "border-emerald-200 bg-emerald-50";
                  } else if (selectedAnswer === answerNumber && !isCorrect) {
                    colorClass = "border-rose-200 bg-rose-50";
                  } else if (isCorrect) {
                    colorClass = "border-emerald-200 bg-emerald-50";
                  }
                }

                return (
                  <button
                    key={`${item.id}-${choiceIndex}`}
                    type="button"
                    onClick={() =>
                      setSelectedAnswers((prev) => ({
                        ...prev,
                        [item.id]: answerNumber,
                      }))
                    }
                    className={`rounded-lg border px-3 py-2 text-left transition ${colorClass}`}
                  >
                    {answerNumber}. {choice}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setAnswerVisible((prev) => ({
                    ...prev,
                    [item.id]: true,
                  }))
                }
                className="rounded-lg border border-emerald-300 px-3 py-1 text-xs text-emerald-700"
              >
                정답
              </button>
              <button
                type="button"
                onClick={() =>
                  setExplanationState((prev) => ({
                    ...prev,
                    [item.id]: prev[item.id] === 0 ? 1 : 2,
                  }))
                }
                className="rounded-lg border border-slate-300 px-3 py-1 text-xs"
              >
                {explanationViewState === 0 ? "해설보기" : explanationViewState === 1 ? "한 번 더 누르면 해설 표시" : "해설 표시 중"}
              </button>
            </div>

            {explanationViewState === 2 && (
              <div className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                {problem.explanation ?? "해설이 없습니다."}
              </div>
            )}
          </article>
        );
      })}

      {items.length > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
          >
            이전
          </button>
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
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
