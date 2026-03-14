import type { Database } from "@/types/database";

export type ProblemRow = Database["public"]["Tables"]["problems"]["Row"];
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export interface ProblemWithCategory extends ProblemRow {
  categories: Pick<CategoryRow, "id" | "name"> | null;
  starred: boolean;
}

export interface ProblemFormValues {
  id?: string;
  category_id: string | null;
  question_text: string;
  image_url: string;
  choice_1: string;
  choice_2: string;
  choice_3: string;
  choice_4: string;
  correct_answer: number;
  explanation: string;
  is_active: boolean;
}

export interface ProblemFilters {
  categoryId: string;
  active: "all" | "active" | "inactive";
  starred: "all" | "starred" | "unstarred";
  keyword: string;
}
