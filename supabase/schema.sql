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

create policy "users_select_own"
on public.users for select
to authenticated
using (auth.uid() = id);

create policy "users_insert_own"
on public.users for insert
to authenticated
with check (auth.uid() = id);

create policy "users_update_own"
on public.users for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "categories_select_own"
on public.categories for select
to authenticated
using (auth.uid() = user_id);

create policy "categories_insert_own"
on public.categories for insert
to authenticated
with check (auth.uid() = user_id);

create policy "categories_update_own"
on public.categories for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "categories_delete_own"
on public.categories for delete
to authenticated
using (auth.uid() = user_id);

create policy "problems_select_own"
on public.problems for select
to authenticated
using (auth.uid() = user_id);

create policy "problems_insert_own"
on public.problems for insert
to authenticated
with check (auth.uid() = user_id);

create policy "problems_update_own"
on public.problems for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "problems_delete_own"
on public.problems for delete
to authenticated
using (auth.uid() = user_id);

create policy "problem_stats_select_own"
on public.problem_stats for select
to authenticated
using (auth.uid() = user_id);

create policy "problem_stats_insert_own"
on public.problem_stats for insert
to authenticated
with check (auth.uid() = user_id);

create policy "problem_stats_update_own"
on public.problem_stats for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "problem_stats_delete_own"
on public.problem_stats for delete
to authenticated
using (auth.uid() = user_id);

create policy "quiz_sessions_select_own"
on public.quiz_sessions for select
to authenticated
using (auth.uid() = user_id);

create policy "quiz_sessions_insert_own"
on public.quiz_sessions for insert
to authenticated
with check (auth.uid() = user_id);

create policy "quiz_sessions_update_own"
on public.quiz_sessions for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "quiz_sessions_delete_own"
on public.quiz_sessions for delete
to authenticated
using (auth.uid() = user_id);

create policy "quiz_session_items_select_own"
on public.quiz_session_items for select
to authenticated
using (
  exists (
    select 1
    from public.quiz_sessions
    where quiz_sessions.id = quiz_session_items.session_id
      and quiz_sessions.user_id = auth.uid()
  )
);

create policy "quiz_session_items_insert_own"
on public.quiz_session_items for insert
to authenticated
with check (
  exists (
    select 1
    from public.quiz_sessions
    where quiz_sessions.id = quiz_session_items.session_id
      and quiz_sessions.user_id = auth.uid()
  )
);

create policy "quiz_session_items_update_own"
on public.quiz_session_items for update
to authenticated
using (
  exists (
    select 1
    from public.quiz_sessions
    where quiz_sessions.id = quiz_session_items.session_id
      and quiz_sessions.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.quiz_sessions
    where quiz_sessions.id = quiz_session_items.session_id
      and quiz_sessions.user_id = auth.uid()
  )
);

create policy "quiz_session_items_delete_own"
on public.quiz_session_items for delete
to authenticated
using (
  exists (
    select 1
    from public.quiz_sessions
    where quiz_sessions.id = quiz_session_items.session_id
      and quiz_sessions.user_id = auth.uid()
  )
);
