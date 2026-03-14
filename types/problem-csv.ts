export type ProblemsTab = "single" | "xlsx";

export interface CsvProblemRow {
  category: string;
  question_text: string;
  image_url: string;
  choice_1: string;
  choice_2: string;
  choice_3: string;
  choice_4: string;
  correct_answer: string;
  explanation: string;
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
