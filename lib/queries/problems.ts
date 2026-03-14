import { supabase } from "@/lib/supabase/client";
import type { ValidatedCsvProblemRow } from "@/types/problem-csv";
import type { CategoryRow, ProblemFilters, ProblemFormValues, ProblemWithCategory } from "@/types/problem-management";

export async function fetchProblems(userId: string, filters: ProblemFilters): Promise<ProblemWithCategory[]> {
  let query = supabase
    .from("problems")
    .select(
      "id,user_id,category_id,order_index,question_text,image_url,choice_1,choice_2,choice_3,choice_4,correct_answer,explanation,difficulty,is_active,created_at,updated_at,categories(id,name)",
    )
    .eq("user_id", userId)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters.active !== "all") {
    query = query.eq("is_active", filters.active === "active");
  }
  if (filters.keyword.trim()) {
    query = query.ilike("question_text", `%${filters.keyword.trim()}%`);
  }

  const [{ data, error }, { data: stats, error: statsError }] = await Promise.all([
    query,
    supabase.from("problem_stats").select("problem_id,starred").eq("user_id", userId),
  ]);
  if (error) throw error;
  if (statsError) throw statsError;

  const starredMap = new Map((stats ?? []).map((stat) => [stat.problem_id, Boolean(stat.starred)]));
  const problems = ((data ?? []) as unknown as Omit<ProblemWithCategory, "starred">[]).map((problem) => ({
    ...problem,
    starred: starredMap.get(problem.id) ?? false,
  }));

  if (filters.starred === "starred") return problems.filter((problem) => problem.starred);
  if (filters.starred === "unstarred") return problems.filter((problem) => !problem.starred);
  return problems;
}

export async function fetchProblemsByIds(userId: string, ids: string[]): Promise<ProblemWithCategory[]> {
  if (ids.length === 0) return [];

  const [{ data, error }, { data: stats, error: statsError }] = await Promise.all([
    supabase
      .from("problems")
      .select(
        "id,user_id,category_id,order_index,question_text,image_url,choice_1,choice_2,choice_3,choice_4,correct_answer,explanation,difficulty,is_active,created_at,updated_at,categories(id,name)",
      )
      .eq("user_id", userId)
      .in("id", ids),
    supabase.from("problem_stats").select("problem_id,starred").eq("user_id", userId).in("problem_id", ids),
  ]);

  if (error) throw error;
  if (statsError) throw statsError;

  const starredMap = new Map((stats ?? []).map((stat) => [stat.problem_id, Boolean(stat.starred)]));
  const orderMap = new Map(ids.map((id, index) => [id, index]));

  return ((data ?? []) as unknown as Omit<ProblemWithCategory, "starred">[])
    .map((problem) => ({
      ...problem,
      starred: starredMap.get(problem.id) ?? false,
    }))
    .sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
}

async function getNextOrderIndex(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("problems")
    .select("order_index")
    .eq("user_id", userId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data?.order_index ?? 0) + 1;
}

export async function createProblems(userId: string, valuesList: ProblemFormValues[]): Promise<void> {
  if (valuesList.length === 0) return;

  const startOrderIndex = await getNextOrderIndex(userId);
  const { data, error } = await supabase
    .from("problems")
    .insert(
      valuesList.map((values, index) => ({
        user_id: userId,
        category_id: values.category_id,
        order_index: startOrderIndex + index,
        question_text: values.question_text,
        image_url: values.image_url.trim() || null,
        choice_1: values.choice_1,
        choice_2: values.choice_2,
        choice_3: values.choice_3,
        choice_4: values.choice_4,
        correct_answer: values.correct_answer,
        explanation: values.explanation || null,
        difficulty: "medium" as const,
        is_active: values.is_active,
      })),
    )
    .select("id");

  if (error) throw error;

  const insertedProblems = data ?? [];
  if (insertedProblems.length === 0) return;

  const { error: statsError } = await supabase
    .from("problem_stats")
    .insert(insertedProblems.map((problem) => ({ user_id: userId, problem_id: problem.id })));
  if (statsError) throw statsError;
}

export async function updateProblem(problemId: string, values: ProblemFormValues): Promise<void> {
  const { error } = await supabase
    .from("problems")
    .update({
      category_id: values.category_id,
      question_text: values.question_text,
      image_url: values.image_url.trim() || null,
      choice_1: values.choice_1,
      choice_2: values.choice_2,
      choice_3: values.choice_3,
      choice_4: values.choice_4,
      correct_answer: values.correct_answer,
      explanation: values.explanation || null,
      is_active: values.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", problemId);

  if (error) throw error;
}

export async function updateProblemExplanation(problemId: string, explanation: string): Promise<void> {
  const { error } = await supabase
    .from("problems")
    .update({
      explanation: explanation || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", problemId);

  if (error) throw error;
}

export async function deleteProblem(problemId: string): Promise<void> {
  const { error } = await supabase.from("problems").delete().eq("id", problemId);
  if (error) throw error;
}

export async function fetchActiveProblemsForQuiz(userId: string) {
  const { data, error } = await supabase
    .from("problems")
    .select("id, order_index, category_id, difficulty, question_text")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("order_index", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

interface CreateProblemsFromCsvResult {
  createdProblems: number;
  createdCategories: number;
}

export async function createProblemsFromCsv(
  userId: string,
  rows: ValidatedCsvProblemRow[],
  categories: CategoryRow[],
): Promise<CreateProblemsFromCsvResult> {
  if (rows.length === 0) {
    return { createdProblems: 0, createdCategories: 0 };
  }

  const categoryMap = new Map(categories.map((category) => [category.name.trim().toLowerCase(), category]));
  const missingCategoryNames = Array.from(new Set(rows.map((row) => row.categoryName.trim()))).filter(
    (name) => !categoryMap.has(name.toLowerCase()),
  );

  let createdCategories = 0;

  if (missingCategoryNames.length > 0) {
    const { data: created, error: createCategoryError } = await supabase
      .from("categories")
      .insert(missingCategoryNames.map((name) => ({ user_id: userId, name })))
      .select("id,user_id,name,created_at");

    if (createCategoryError) throw createCategoryError;

    createdCategories = created?.length ?? 0;
    (created ?? []).forEach((category) => {
      categoryMap.set(category.name.trim().toLowerCase(), category);
    });
  }

  const startOrderIndex = await getNextOrderIndex(userId);
  const problemPayload = rows.map((row, index) => {
    const category = categoryMap.get(row.categoryName.trim().toLowerCase());
    if (!category) {
      throw new Error(`카테고리를 찾을 수 없습니다: ${row.categoryName}`);
    }

    return {
      user_id: userId,
      category_id: category.id,
      order_index: startOrderIndex + index,
      question_text: row.question_text,
      image_url: row.image_url.trim() || null,
      choice_1: row.choice_1,
      choice_2: row.choice_2,
      choice_3: row.choice_3,
      choice_4: row.choice_4,
      correct_answer: row.correct_answer,
      explanation: row.explanation || null,
      difficulty: "medium" as const,
      is_active: row.is_active,
    };
  });

  const { data: insertedProblems, error: insertProblemsError } = await supabase
    .from("problems")
    .insert(problemPayload)
    .select("id");

  if (insertProblemsError) throw insertProblemsError;

  const problemIds = (insertedProblems ?? []).map((problem) => problem.id);
  if (problemIds.length > 0) {
    const { error: statsError } = await supabase
      .from("problem_stats")
      .insert(problemIds.map((problemId) => ({ user_id: userId, problem_id: problemId })));
    if (statsError) throw statsError;
  }

  return {
    createdProblems: problemIds.length,
    createdCategories,
  };
}
