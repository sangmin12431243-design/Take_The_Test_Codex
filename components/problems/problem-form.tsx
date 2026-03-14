"use client";

import { useEffect, useState } from "react";
import { ProblemImage } from "@/components/problem-image";
import type { CategoryRow, ProblemFormValues } from "@/types/problem-management";

const createEmptyProblem = (): ProblemFormValues => ({
  category_id: null,
  question_text: "",
  image_url: "",
  choice_1: "",
  choice_2: "",
  choice_3: "",
  choice_4: "",
  correct_answer: 1,
  explanation: "",
  is_active: true,
});

interface Props {
  categories: CategoryRow[];
  initialValues?: ProblemFormValues | null;
  onCreate: (valuesList: ProblemFormValues[]) => Promise<boolean>;
  onUpdate: (values: ProblemFormValues) => Promise<boolean>;
  onCancelEdit: () => void;
}

export function ProblemForm({ categories, initialValues, onCreate, onUpdate, onCancelEdit }: Props) {
  const [valuesList, setValuesList] = useState<ProblemFormValues[]>([createEmptyProblem()]);

  useEffect(() => {
    setValuesList(initialValues ? [initialValues] : [createEmptyProblem()]);
  }, [initialValues]);

  const updateField = <K extends keyof ProblemFormValues>(
    index: number,
    key: K,
    value: ProblemFormValues[K],
  ) => {
    setValuesList((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    );
  };

  const addProblem = () => setValuesList((prev) => [...prev, createEmptyProblem()]);
  const removeProblem = (index: number) => {
    setValuesList((prev) => (prev.length === 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index)));
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{initialValues ? "문제 수정" : "문제 추가"}</h2>
      </div>

      <form
        className="mt-4 grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const submitted = initialValues
            ? await onUpdate(valuesList[0])
            : await onCreate(valuesList.filter((item) => item.question_text.trim()));

          if (submitted && !initialValues) {
            setValuesList([createEmptyProblem()]);
          }
        }}
      >
        {valuesList.map((values, index) => (
          <article key={index} className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">{initialValues ? "수정 중인 문제" : `문제 ${index + 1}`}</h3>
              {!initialValues && valuesList.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeProblem(index)}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600"
                >
                  카드 삭제
                </button>
              )}
            </div>

            <div className="grid gap-3">
              <select
                value={values.category_id ?? ""}
                onChange={(e) => updateField(index, "category_id", e.target.value || null)}
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
                onChange={(e) => updateField(index, "question_text", e.target.value)}
                placeholder="문제를 입력하세요"
                className="min-h-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />

              <input
                value={values.image_url}
                onChange={(e) => updateField(index, "image_url", e.target.value)}
                placeholder="이미지 URL"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />

              <ProblemImage src={values.image_url} alt="문제 이미지 미리보기" />

              {(["choice_1", "choice_2", "choice_3", "choice_4"] as const).map((key, choiceIndex) => (
                <input
                  key={key}
                  required
                  value={values[key]}
                  onChange={(e) => updateField(index, key, e.target.value)}
                  placeholder={`보기 ${choiceIndex + 1}`}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              ))}

              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={values.correct_answer}
                  onChange={(e) => updateField(index, "correct_answer", Number(e.target.value))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value={1}>정답 1번</option>
                  <option value={2}>정답 2번</option>
                  <option value={3}>정답 3번</option>
                  <option value={4}>정답 4번</option>
                </select>

                <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={values.is_active}
                    onChange={(e) => updateField(index, "is_active", e.target.checked)}
                  />
                  활성 문제로 등록
                </label>
              </div>

              <textarea
                value={values.explanation}
                onChange={(e) => updateField(index, "explanation", e.target.value)}
                placeholder="해설"
                className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </article>
        ))}

        {!initialValues && (
          <button
            type="button"
            onClick={addProblem}
            className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700"
          >
            문제 카드 추가
          </button>
        )}

        <div className="flex gap-2">
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            {initialValues ? "수정 저장" : `${valuesList.length}문제 저장`}
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
