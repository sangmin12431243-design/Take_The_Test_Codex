-- Supabase PostgreSQL schema (initial draft)
create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key,
  email text not null unique,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  order_index integer not null default 0,
  question_text text not null,
  choice_1 text not null,
  choice_2 text not null,
  choice_3 text not null,
  choice_4 text not null,
  correct_answer smallint not null check (correct_answer between 1 and 4),
  explanation text,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.problem_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  problem_id uuid not null references public.problems(id) on delete cascade,
  total_solved_count integer not null default 0,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  starred boolean not null default false,
  mastered boolean not null default false,
  last_solved_at timestamptz,
  last_wrong_at timestamptz,
  mastered_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, problem_id)
);

create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  mode text not null check (mode in ('sequential', 'random')),
  show_explanation boolean not null default true,
  answer_mode text not null check (answer_mode in ('instant', 'final')),
  question_count integer not null,
  selected_categories text[] not null default '{}',
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  source_type text not null default 'normal' check (source_type in ('normal', 'wrong_note', 'starred', 'unmastered')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  score numeric(5,2)
);

create table if not exists public.quiz_session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.quiz_sessions(id) on delete cascade,
  problem_id uuid not null references public.problems(id) on delete cascade,
  shown_order integer not null,
  user_answer smallint,
  is_correct boolean,
  starred_at_exam_time boolean not null default false,
  unique (session_id, shown_order)
);

-- RLS baseline
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.problems enable row level security;
alter table public.problem_stats enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.quiz_session_items enable row level security;
