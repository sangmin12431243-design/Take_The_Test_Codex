import { supabase } from "@/lib/supabase/client";
import type { CategoryRow } from "@/types/problem-management";

type CategoryQueryResult = {
  data: CategoryRow[] | null;
  error: Error | null;
};

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs = 10000) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error("카테고리 요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.")), timeoutMs);
    }),
  ]);
}

export async function fetchCategories(userId: string): Promise<CategoryRow[]> {
  const categoryPromise = supabase
    .from("categories")
    .select("id, user_id, name, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const { data, error } = await withTimeout<CategoryQueryResult>(
    categoryPromise as PromiseLike<CategoryQueryResult>,
  );

  if (error) throw error;
  return data ?? [];
}

export async function createCategory(userId: string, name: string): Promise<CategoryRow> {
  const normalizedName = name.trim();

  const { data: existing, error: existingError } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", normalizedName)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) {
    throw new Error("같은 이름의 카테고리가 이미 있습니다.");
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({ user_id: userId, name: normalizedName })
    .select("id, user_id, name, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) throw error;
}
