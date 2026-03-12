import type { Database, Difficulty } from "@/types/database";

export type ProblemRow = Database["public"]["Tables"]["problems"]["Row"];
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export interface ProblemWithCategory extends ProblemRow {
  categories: Pick<CategoryRow, "id" | "name"> | null;
}

export interface ProblemFormValues {
  id?: string;
  category_id: string | null;
  question_text: string;
  choice_1: string;
  choice_2: string;
  choice_3: string;
  choice_4: string;
  correct_answer: number;
  explanation: string;
  difficulty: Difficulty;
  order_index: number;
  is_active: boolean;
}

export interface ProblemFilters {
  categoryId: string;
  difficulty: "all" | Difficulty;
  active: "all" | "active" | "inactive";
  keyword: string;
}
