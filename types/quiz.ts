import type { AnswerMode, Difficulty, QuizMode } from "@/types/database";

export type QuestionCountOption = 10 | 20 | 30 | 40 | 50 | "all";

export interface QuizSetupValues {
  selectedCategoryIds: string[];
  mode: QuizMode;
  showExplanation: boolean;
  questionCount: QuestionCountOption;
  answerMode: AnswerMode;
}

export interface QuizProblem {
  id: string;
  category_id: string | null;
  order_index: number;
  question_text: string;
  image_url: string | null;
  choice_1: string;
  choice_2: string;
  choice_3: string;
  choice_4: string;
  correct_answer: number;
  explanation: string | null;
  difficulty: Difficulty;
}

export type ExplanationState = "idle" | "armed" | "visible";

export type QuizSourcePage = "wrong_note" | "starred";
