import { supabase } from "@/lib/supabase/client";

interface AnswerStatInput {
  userId: string;
  problemId: string;
  isCorrect: boolean;
}

export async function applyProblemStats(inputs: AnswerStatInput[]) {
  for (const input of inputs) {
    const { data: stat, error } = await supabase
      .from("problem_stats")
      .select("id,total_solved_count,correct_count,wrong_count,mastered")
      .eq("user_id", input.userId)
      .eq("problem_id", input.problemId)
      .maybeSingle();

    if (error) throw error;

    const now = new Date().toISOString();
    if (!stat) {
      const { error: insertError } = await supabase.from("problem_stats").insert({
        user_id: input.userId,
        problem_id: input.problemId,
        total_solved_count: 1,
        correct_count: input.isCorrect ? 1 : 0,
        wrong_count: input.isCorrect ? 0 : 1,
        last_solved_at: now,
        last_wrong_at: input.isCorrect ? null : now,
        mastered: input.isCorrect ? false : false,
        mastered_at: null,
      });
      if (insertError) throw insertError;
      continue;
    }

    const nextTotal = stat.total_solved_count + 1;
    const nextCorrect = stat.correct_count + (input.isCorrect ? 1 : 0);
    const nextWrong = stat.wrong_count + (input.isCorrect ? 0 : 1);

    const { error: updateError } = await supabase
      .from("problem_stats")
      .update({
        total_solved_count: nextTotal,
        correct_count: nextCorrect,
        wrong_count: nextWrong,
        last_solved_at: now,
        last_wrong_at: input.isCorrect ? null : now,
        mastered: input.isCorrect ? stat.mastered : false,
        mastered_at: input.isCorrect ? undefined : null,
        updated_at: now,
      })
      .eq("id", stat.id);

    if (updateError) throw updateError;
  }
}

export async function fetchWrongNotes(userId: string) {
  const { data, error } = await supabase
    .from("problem_stats")
    .select("id,problem_id,wrong_count,correct_count,total_solved_count,mastered,mastered_at,problems(id,question_text)")
    .eq("user_id", userId)
    .gt("wrong_count", 0);

  if (error) throw error;
  return (data ?? []) as unknown[];
}

export async function updateMastered(problemStatId: string, mastered: boolean) {
  const { error } = await supabase
    .from("problem_stats")
    .update({ mastered, mastered_at: mastered ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq("id", problemStatId);

  if (error) throw error;
}

export async function fetchStarredProblems(userId: string) {
  const { data, error } = await supabase
    .from("problem_stats")
    .select("id,problem_id,starred,problems(id,question_text,difficulty,order_index)")
    .eq("user_id", userId)
    .eq("starred", true)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown[];
}
