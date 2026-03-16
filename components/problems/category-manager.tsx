"use client";

import { useEffect, useMemo, useState } from "react";
import type { CategoryRow } from "@/types/problem-management";

interface Props {
  categories: CategoryRow[];
  onCreate: (name: string) => Promise<boolean>;
  onDelete: (categoryId: string) => Promise<void>;
}

type SortMode = "latest" | "oldest" | "asc" | "desc";

const PAGE_SIZE = 18;

function getPageNumbers(currentPage: number, totalPages: number) {
  const start = Math.floor((currentPage - 1) / 10) * 10 + 1;
  const end = Math.min(totalPages, start + 9);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function CategoryManager({ categories, onCreate, onDelete }: Props) {
  const [name, setName] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [page, setPage] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const sortedCategories = useMemo(() => {
    const next = [...categories];

    if (sortMode === "latest") {
      next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortMode === "oldest") {
      next.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortMode === "asc") {
      next.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    } else {
      next.sort((a, b) => b.name.localeCompare(a.name, "ko"));
    }

    return next;
  }, [categories, sortMode]);

  const totalPages = Math.max(1, Math.ceil(sortedCategories.length / PAGE_SIZE));
  const pageNumbers = useMemo(() => getPageNumbers(page, totalPages), [page, totalPages]);
  const pagedCategories = useMemo(
    () => sortedCategories.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [page, sortedCategories],
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const handleCreate = async () => {
    const normalizedName = name.trim();
    if (!normalizedName) return;

    const duplicated = categories.some((category) => category.name.trim().toLowerCase() === normalizedName.toLowerCase());
    if (duplicated) {
      setToastMessage("이미 같은 카테고리가 있습니다.");
      return;
    }

    const created = await onCreate(normalizedName);
    if (created) {
      setName("");
      setPage(1);
      setOpen(true);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {toastMessage && (
        <div className="mb-3 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm">{toastMessage}</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-2 text-left text-base font-semibold text-slate-900"
          aria-expanded={open}
        >
          <span>{open ? "▾" : "▸"}</span>
          <span>카테고리 관리</span>
        </button>

        {open && (
          <select
            value={sortMode}
            onChange={(e) => {
              setSortMode(e.target.value as SortMode);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="latest">최신 추가순</option>
            <option value="oldest">오래된 추가순</option>
            <option value="asc">이름 오름차순</option>
            <option value="desc">이름 내림차순</option>
          </select>
        )}
      </div>

      {open && (
        <>
          <form
            className="mt-3 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              await handleCreate();
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="새 카테고리 이름"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white">
              추가
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {pagedCategories.map((category) => (
              <div
                key={category.id}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              >
                <span>{category.name}</span>
                <button
                  type="button"
                  onClick={() => onDelete(category.id)}
                  className="text-sm font-bold text-slate-400 transition hover:text-red-500"
                  aria-label={`${category.name} 삭제`}
                >
                  x
                </button>
              </div>
            ))}
          </div>

          {sortedCategories.length > PAGE_SIZE && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
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
        </>
      )}
    </section>
  );
}
