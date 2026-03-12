import type { Difficulty } from "@/types/database";

export type ProblemsTab = "single" | "csv";

export interface CsvProblemRow {
  category: string;
  order_index: string;
  question_text: string;
  choice_1: string;
  choice_2: string;
  choice_3: string;
  choice_4: string;
  correct_answer: string;
  explanation: string;
  difficulty: string;
  is_active: string;
}

export interface ParsedCsvProblemRow {
  rowNumber: number;
  raw: CsvProblemRow;
}

export interface CsvValidationError {
  rowNumber: number;
  message: string;
}

export interface ValidatedCsvProblemRow {
  rowNumber: number;
  categoryName: string;
  order_index: number;
  question_text: string;
  choice_1: string;
  choice_2: string;
  choice_3: string;
  choice_4: string;
  correct_answer: number;
  explanation: string;
  difficulty: Difficulty;
  is_active: boolean;
}
