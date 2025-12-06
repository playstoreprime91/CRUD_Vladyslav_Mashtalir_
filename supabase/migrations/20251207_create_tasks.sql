create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  priority integer not null default 3, 
  due_date timestamptz,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_tasks_title on public.tasks (lower(title));
create index if not exists idx_tasks_created_at on public.tasks (created_at desc);

