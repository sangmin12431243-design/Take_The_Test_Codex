"use client";

import { useState } from "react";
import type { CategoryRow } from "@/types/problem-management";

interface Props {
  categories: CategoryRow[];
  onCreate: (name: string) => Promise<void>;
}

export function CategoryManager({ categories, onCreate }: Props) {
  const [name, setName] = useState("");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold">카테고리 관리</h2>
      <div className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="새 카테고리 이름"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={async () => {
            if (!name.trim()) return;
            await onCreate(name);
            setName("");
          }}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
        >
          추가
        </button>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {categories.map((category) => (
          <li key={category.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
            {category.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
