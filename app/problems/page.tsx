"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { CategoryManager } from "@/components/problems/category-manager";
import { ProblemCsvUpload } from "@/components/problems/problem-csv-upload";
import { ProblemForm } from "@/components/problems/problem-form";
import { createCategory, deleteCategory, fetchCategories } from "@/lib/queries/categories";
import { createProblems } from "@/lib/queries/problems";
import type { ProblemsTab } from "@/types/problem-csv";
import type { CategoryRow } from "@/types/problem-management";

export default function ProblemsPage() {
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProblemsTab>("single");

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    return "문제를 처리하는 중 오류가 발생했습니다.";
  };

  const runMutation = async (action: () => Promise<void>) => {
    setMutating(true);
    setErrorMessage(null);
    try {
      await action();
      return true;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return false;
    } finally {
      setMutating(false);
    }
  };

  const loadCategories = useCallback(async () => {
    if (!user?.id) return;
    setLoadingCategories(true);
    setErrorMessage(null);
    try {
      const nextCategories = await fetchCategories(user.id);
      setCategories(nextCategories);
    } catch (error) {
      setCategories([]);
      setErrorMessage(error instanceof Error ? error.message : "카테고리를 불러오지 못했습니다.");
    } finally {
      setLoadingCategories(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const isAuthReady = useMemo(() => !loading && Boolean(user), [loading, user]);
  const busy = loadingCategories || mutating;

  if (!isAuthReady || !user) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
        <div className="mb-6">
          <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
            홈으로
          </Link>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">문제 관리</h1>
          <p className="mt-2 text-sm text-slate-600">로그인 후 카테고리와 문제를 관리할 수 있습니다.</p>
        </section>
      </main>
    );
  }

  const userId = user.id;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6">
      <div>
        <Link href="/" className="text-sm font-semibold text-brand-700 hover:underline">
          홈으로
        </Link>
      </div>

      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">문제 관리</h1>
        <p className="mt-2 text-sm text-slate-600">문제를 직접 추가하거나 XLSX로 업로드할 수 있습니다.</p>
      </header>

      {loadingCategories && <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">카테고리 불러오는 중...</div>}

      <CategoryManager
        categories={categories}
        onCreate={async (name) =>
          runMutation(async () => {
            await createCategory(userId, name);
            await loadCategories();
          })
        }
        onDelete={async (categoryId) => {
          await runMutation(async () => {
            await deleteCategory(categoryId);
            await loadCategories();
          });
        }}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("single")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              activeTab === "single" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            직접 추가
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("xlsx")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              activeTab === "xlsx" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            XLSX 업로드
          </button>
          <Link href="/problems/list" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
            문제 목록
          </Link>
        </div>
      </section>

      {activeTab === "single" ? (
        <ProblemForm
          categories={categories}
          initialValues={null}
          onCancelEdit={() => {}}
          onCreate={async (valuesList) =>
            runMutation(async () => {
              await createProblems(userId, valuesList);
            })
          }
          onUpdate={async () => true}
        />
      ) : (
        <ProblemCsvUpload userId={userId} categories={categories} onUploaded={loadCategories} />
      )}

      {errorMessage && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>}

      {busy && <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">처리 중...</div>}
    </main>
  );
}
