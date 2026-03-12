import { supabase } from "@/lib/supabase/client";
import type { AnswerMode, QuizMode } from "@/types/database";
import type { QuizProblem, QuizSetupValues } from "@/types/quiz";

export interface SessionWithItems {
  id: string;
  user_id: string;
  mode: QuizMode;
  show_explanation: boolean;
  answer_mode: AnswerMode;
  question_count: number;
  status: "in_progress" | "completed" | "abandoned";
  score: number | null;
  quiz_session_items: Array<{
    id: string;
    problem_id: string;
    shown_order: number;
    user_answer: number | null;
    is_correct: boolean | null;
    starred_at_exam_time: boolean;
    problems: QuizProblem;
  }>;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function fetchActiveProblemsByCategories(userId: string, categoryIds: string[]) {
  let query = supabase
    .from("problems")
    .select(
      "id,category_id,order_index,question_text,choice_1,choice_2,choice_3,choice_4,correct_answer,explanation,difficulty",
    )
    .eq("user_id", userId)
    .eq("is_active", true);

  if (categoryIds.length > 0) {
    query = query.in("category_id", categoryIds);
  }

  const { data, error } = await query.order("order_index", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as QuizProblem[];
}

function buildBalancedSelection(problems: QuizProblem[], categoryIds: string[], requestedCount: number) {
  if (problems.length <= requestedCount) return problems;
  if (categoryIds.length === 0) return problems.slice(0, requestedCount);

  const byCategory = new Map<string, QuizProblem[]>();
  for (const categoryId of categoryIds) byCategory.set(categoryId, []);

  for (const problem of problems) {
    const key = problem.category_id ?? "";
    if (!key || !byCategory.has(key)) continue;
    byCategory.get(key)?.push(problem);
  }

  const perCategoryBase = Math.floor(requestedCount / categoryIds.length);
  let remainder = requestedCount % categoryIds.length;
  const picked: QuizProblem[] = [];

  for (const categoryId of categoryIds) {
    const pool = byCategory.get(categoryId) ?? [];
    const target = perCategoryBase + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;

    picked.push(...pool.slice(0, target));
  }

  if (picked.length < requestedCount) {
    const used = new Set(picked.map((p) => p.id));
    const fallback = problems.filter((p) => !used.has(p.id));
    picked.push(...fallback.slice(0, requestedCount - picked.length));
  }

  return picked.slice(0, requestedCount);
}

export async function createQuizSession(userId: string, values: QuizSetupValues): Promise<string> {
  const allProblems = await fetchActiveProblemsByCategories(userId, values.selectedCategoryIds);
  const totalCount = values.questionCount === "all" ? allProblems.length : values.questionCount;
  const balanced = buildBalancedSelection(allProblems, values.selectedCategoryIds, totalCount);
  const ordered = values.mode === "random" ? shuffle(balanced) : [...balanced].sort((a, b) => a.order_index - b.order_index);

  const { data: session, error: sessionError } = await supabase
    .from("quiz_sessions")
    .insert({
      user_id: userId,
      mode: values.mode,
      show_explanation: values.showExplanation,
      answer_mode: values.answerMode,
      question_count: ordered.length,
      selected_categories: values.selectedCategoryIds,
      status: "in_progress",
      source_type: "normal",
    })
    .select("id")
    .single();

  if (sessionError) throw sessionError;

  if (ordered.length > 0) {
    const items = ordered.map((problem, idx) => ({
      session_id: session.id,
      problem_id: problem.id,
      shown_order: idx + 1,
      starred_at_exam_time: false,
    }));

    const { error: itemError } = await supabase.from("quiz_session_items").insert(items);
    if (itemError) throw itemError;
  }

  return session.id;
}

export async function fetchSession(sessionId: string): Promise<SessionWithItems> {
  const { data, error } = await supabase
    .from("quiz_sessions")
    .select(
      "id,user_id,mode,show_explanation,answer_mode,question_count,status,score,quiz_session_items(id,problem_id,shown_order,user_answer,is_correct,starred_at_exam_time,problems(id,category_id,order_index,question_text,choice_1,choice_2,choice_3,choice_4,correct_answer,explanation,difficulty))",
    )
    .eq("id", sessionId)
    .single();

  if (error) throw error;
  return data as unknown as SessionWithItems;
}

export async function saveSessionItemAnswer(itemId: string, answer: number, isCorrect: boolean) {
  const { error } = await supabase
    .from("quiz_session_items")
    .update({ user_answer: answer, is_correct: isCorrect })
    .eq("id", itemId);

  if (error) throw error;
}

export async function setSessionItemStar(itemId: string, starred: boolean) {
  const { error } = await supabase
    .from("quiz_session_items")
    .update({ starred_at_exam_time: starred })
    .eq("id", itemId);
  if (error) throw error;
}

export async function setProblemStar(userId: string, problemId: string, starred: boolean) {
  const { data, error } = await supabase
    .from("problem_stats")
    .select("id")
    .eq("user_id", userId)
    .eq("problem_id", problemId)
    .maybeSingle();

  if (error) throw error;

  if (data?.id) {
    const { error: updateError } = await supabase
      .from("problem_stats")
      .update({ starred, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await supabase.from("problem_stats").insert({
    user_id: userId,
    problem_id: problemId,
    starred,
  });
  if (insertError) throw insertError;
}

export async function completeSession(sessionId: string, score: number) {
  const { error } = await supabase
    .from("quiz_sessions")
    .update({ status: "completed", score, finished_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("status", "in_progress");

  if (error) throw error;
}

export async function fetchInProgressSessions(userId: string) {
  const { data, error } = await supabase
    .from("quiz_sessions")
    .select("id,started_at,question_count,mode,answer_mode,show_explanation")
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
