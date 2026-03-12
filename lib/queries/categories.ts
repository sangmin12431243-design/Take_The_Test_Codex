import { supabase } from "@/lib/supabase/client";
import type { CategoryRow } from "@/types/problem-management";

export async function fetchCategories(userId: string): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, user_id, name, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createCategory(userId: string, name: string): Promise<CategoryRow> {
  const { data, error } = await supabase
    .from("categories")
    .insert({ user_id: userId, name: name.trim() })
    .select("id, user_id, name, created_at")
    .single();

  if (error) throw error;
  return data;
}
