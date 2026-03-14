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
          value={filters.starred}
          onChange={(e) => onChange({ ...filters, starred: e.target.value as ProblemFilters["starred"] })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">전체 별표</option>
          <option value="starred">별표만</option>
          <option value="unstarred">별표 아님</option>
        </select>

        <select
          value={filters.active}
          onChange={(e) => onChange({ ...filters, active: e.target.value as ProblemFilters["active"] })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">전체 상태</option>
          <option value="active">활성</option>
          <option value="inactive">비활성</option>
        </select>

        <select
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value as ProblemFilters["sort"] })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="latest">최신 추가순</option>
          <option value="oldest">오래된 순</option>
          <option value="asc">오름차순</option>
          <option value="desc">내림차순</option>
        </select>
      </div>
    </section>
  );
}
