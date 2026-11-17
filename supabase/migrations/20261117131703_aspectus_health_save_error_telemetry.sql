-- Narrow operational telemetry: error codes only. Never store draft text or customer data.
create table public.aspectus_save_errors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  actor_id uuid not null references public.users(id) on delete cascade,
  module_id uuid references public.modules(id) on delete set null,
  operation text not null check(operation in
    ('lesson_progress','quiz_result','assignment_upload','assignment_submission','review_draft','review_decision')),
  error_code text not null default 'unknown'
    check(char_length(error_code) between 1 and 64),
  occurred_at timestamptz not null default now()
);

create index aspectus_save_errors_org_recent on public.aspectus_save_errors(org_id,occurred_at desc);
alter table public.aspectus_save_errors enable row level security;
revoke all on table public.aspectus_save_errors from public,anon;
grant select,insert on table public.aspectus_save_errors to authenticated;

create policy aspectus_save_errors_insert_own on public.aspectus_save_errors
 for insert to authenticated with check (
  actor_id=(select auth.uid())
  and exists (
   select 1 from public.users u
   where u.id=(select auth.uid()) and u.org_id=aspectus_save_errors.org_id and u.is_active
  )
  and (module_id is null or exists(
   select 1 from public.modules m
   where m.id=aspectus_save_errors.module_id and m.org_id=aspectus_save_errors.org_id
  ))
 );
create policy aspectus_save_errors_super_admin_read on public.aspectus_save_errors
 for select to authenticated using (public.aspectus_can_admin(org_id));
