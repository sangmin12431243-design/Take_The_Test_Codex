export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Difficulty = "easy" | "medium" | "hard";
export type QuizMode = "sequential" | "random";
export type AnswerMode = "instant" | "final";
export type QuizStatus = "in_progress" | "completed" | "abandoned";
export type QuizSourceType = "normal" | "wrong_note" | "starred" | "unmastered";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          created_at?: string;
        };
        Update: {
          email?: string;
          name?: string | null;
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          name?: string;
          created_at?: string;
        };
      };
      problems: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          order_index: number;
          question_text: string;
          choice_1: string;
          choice_2: string;
          choice_3: string;
          choice_4: string;
          correct_answer: number;
          explanation: string | null;
          difficulty: Difficulty;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id?: string | null;
          order_index?: number;
          question_text: string;
          choice_1: string;
          choice_2: string;
          choice_3: string;
          choice_4: string;
          correct_answer: number;
          explanation?: string | null;
          difficulty?: Difficulty;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          order_index?: number;
          question_text?: string;
          choice_1?: string;
          choice_2?: string;
          choice_3?: string;
          choice_4?: string;
          correct_answer?: number;
          explanation?: string | null;
          difficulty?: Difficulty;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      problem_stats: {
        Row: {
          id: string;
          user_id: string;
          problem_id: string;
          total_solved_count: number;
          correct_count: number;
          wrong_count: number;
          starred: boolean;
          mastered: boolean;
          last_solved_at: string | null;
          last_wrong_at: string | null;
          mastered_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          problem_id: string;
          total_solved_count?: number;
          correct_count?: number;
          wrong_count?: number;
          starred?: boolean;
          mastered?: boolean;
          last_solved_at?: string | null;
          last_wrong_at?: string | null;
          mastered_at?: string | null;
          updated_at?: string;
        };
        Update: {
          total_solved_count?: number;
          correct_count?: number;
          wrong_count?: number;
          starred?: boolean;
          mastered?: boolean;
          last_solved_at?: string | null;
          last_wrong_at?: string | null;
          mastered_at?: string | null;
          updated_at?: string;
        };
      };
      quiz_sessions: {
        Row: {
          id: string;
          user_id: string;
          mode: QuizMode;
          show_explanation: boolean;
          answer_mode: AnswerMode;
          question_count: number;
          selected_categories: string[];
          status: QuizStatus;
          source_type: QuizSourceType;
          started_at: string;
          finished_at: string | null;
          score: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          mode: QuizMode;
          show_explanation?: boolean;
          answer_mode: AnswerMode;
          question_count: number;
          selected_categories?: string[];
          status?: QuizStatus;
          source_type?: QuizSourceType;
          started_at?: string;
          finished_at?: string | null;
          score?: number | null;
        };
        Update: {
          mode?: QuizMode;
          show_explanation?: boolean;
          answer_mode?: AnswerMode;
          question_count?: number;
          selected_categories?: string[];
          status?: QuizStatus;
          source_type?: QuizSourceType;
          finished_at?: string | null;
          score?: number | null;
        };
      };
      quiz_session_items: {
        Row: {
          id: string;
          session_id: string;
          problem_id: string;
          shown_order: number;
          user_answer: number | null;
          is_correct: boolean | null;
          starred_at_exam_time: boolean;
        };
        Insert: {
          id?: string;
          session_id: string;
          problem_id: string;
          shown_order: number;
          user_answer?: number | null;
          is_correct?: boolean | null;
          starred_at_exam_time?: boolean;
        };
        Update: {
          user_answer?: number | null;
          is_correct?: boolean | null;
          starred_at_exam_time?: boolean;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
