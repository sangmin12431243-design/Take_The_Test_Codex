"use client";

import type { CategoryRow, ProblemFilters } from "@/types/problem-management";

interface Props {
  categories: CategoryRow[];
  filters: ProblemFilters;
  onChange: (next: ProblemFilters) => void;
}

const selectClass =
  "h-11 rounded-full border border-slate-200 bg-slate-100 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-300 focus:bg-white";
const inputClass =
  "h-11 w-full rounded-full border border-slate-200 bg-slate-100 px-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white";

export function ProblemFiltersBar({ categories, filters, onChange }: Props) {
  return (
    <section className="rounded-2xl bg-white p-3 shadow-sm">
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
        <select
          value={filters.categoryId}
          onChange={(e) => onChange({ ...filters, categoryId: e.target.value })}
          className={`${selectClass} min-w-[150px] flex-none`}
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
          className={`${selectClass} min-w-[120px] flex-none`}
        >
          <option value="all">전체 별표</option>
          <option value="starred">별표만</option>
          <option value="unstarred">별표 아님</option>
        </select>

        <select
          value={filters.active}
          onChange={(e) => onChange({ ...filters, active: e.target.value as ProblemFilters["active"] })}
          className={`${selectClass} min-w-[110px] flex-none`}
        >
          <option value="all">전체 상태</option>
          <option value="active">활성</option>
          <option value="inactive">비활성</option>
        </select>

        <select
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value as ProblemFilters["sort"] })}
          className={`${selectClass} min-w-[130px] flex-none`}
        >
          <option value="latest">최신 추가순</option>
          <option value="oldest">오래된 순</option>
          <option value="asc">이름순</option>
          <option value="desc">역이름순</option>
        </select>

        <div className="min-w-[220px] flex-[0_0_33.333%]">
          <input
            value={filters.keyword}
            onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
            placeholder="문제 내용 검색"
            className={inputClass}
          />
        </div>
      </div>
    </section>
  );
}
