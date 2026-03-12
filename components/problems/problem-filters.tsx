"use client";

import type { CategoryRow, ProblemFilters } from "@/types/problem-management";

interface Props {
  categories: CategoryRow[];
  filters: ProblemFilters;
  onChange: (next: ProblemFilters) => void;
}

export function ProblemFiltersBar({ categories, filters, onChange }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          value={filters.keyword}
          onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
          placeholder="문제 내용 검색"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={filters.categoryId}
          onChange={(e) => onChange({ ...filters, categoryId: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">전체 카테고리</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          value={filters.difficulty}
          onChange={(e) => onChange({ ...filters, difficulty: e.target.value as ProblemFilters["difficulty"] })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">전체 난이도</option>
          <option value="easy">easy</option>
          <option value="medium">medium</option>
          <option value="hard">hard</option>
        </select>

        <select
          value={filters.active}
          onChange={(e) => onChange({ ...filters, active: e.target.value as ProblemFilters["active"] })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">활성/비활성 전체</option>
          <option value="active">활성</option>
          <option value="inactive">비활성</option>
        </select>
      </div>
    </section>
  );
}
