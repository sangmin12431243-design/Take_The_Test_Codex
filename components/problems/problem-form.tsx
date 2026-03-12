"use client";

import { useEffect, useState } from "react";
import type { CategoryRow, ProblemFormValues } from "@/types/problem-management";

const defaultValues: ProblemFormValues = {
  category_id: null,
  question_text: "",
  choice_1: "",
  choice_2: "",
  choice_3: "",
  choice_4: "",
  correct_answer: 1,
  explanation: "",
  difficulty: "medium",
  order_index: 0,
  is_active: true,
};

const difficultyLabels: Record<ProblemFormValues["difficulty"], string> = {
  easy: "쉬움",
  medium: "보통",
  hard: "어려움",
};

interface Props {
  categories: CategoryRow[];
  initialValues?: ProblemFormValues | null;
  onSubmit: (values: ProblemFormValues) => Promise<boolean>;
  onCancelEdit: () => void;
}

export function ProblemForm({ categories, initialValues, onSubmit, onCancelEdit }: Props) {
  const [values, setValues] = useState<ProblemFormValues>(defaultValues);

  useEffect(() => {
    if (initialValues) {
      setValues(initialValues);
      return;
    }
    setValues(defaultValues);
  }, [initialValues]);

  const setField = <K extends keyof ProblemFormValues>(key: K, value: ProblemFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold">{initialValues ? "문제 수정" : "문제 추가"}</h2>

      <form
        className="mt-3 grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const submitted = await onSubmit(values);
          if (submitted && !initialValues) setValues(defaultValues);
        }}
      >
        <select
          value={values.category_id ?? ""}
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
          value={values.question_text}
          onChange={(e) => setField("question_text", e.target.value)}
          placeholder="문제를 입력하세요"
          className="min-h-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        {(["choice_1", "choice_2", "choice_3", "choice_4"] as const).map((key, index) => (
          <input
            key={key}
            required
            value={values[key]}
            onChange={(e) => setField(key, e.target.value)}
            placeholder={`선지 ${index + 1}`}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        ))}

        <div className="grid gap-3 sm:grid-cols-3">
          <select
            value={values.correct_answer}
            onChange={(e) => setField("correct_answer", Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value={1}>정답 1번</option>
            <option value={2}>정답 2번</option>
            <option value={3}>정답 3번</option>
            <option value={4}>정답 4번</option>
          </select>

          <select
            value={values.difficulty}
            onChange={(e) => setField("difficulty", e.target.value as ProblemFormValues["difficulty"])}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {Object.entries(difficultyLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={values.order_index}
            onChange={(e) => setField("order_index", Number(e.target.value))}
            placeholder="문제 순서"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <textarea
          value={values.explanation}
          onChange={(e) => setField("explanation", e.target.value)}
          placeholder="해설"
          className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={values.is_active}
            onChange={(e) => setField("is_active", e.target.checked)}
          />
          활성 문제로 등록
        </label>

        <div className="flex gap-2">
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            {initialValues ? "수정 저장" : "문제 저장"}
          </button>
          {initialValues && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              수정 취소
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
