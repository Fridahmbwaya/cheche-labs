-- Reviewer drafts are private, not visible to learners, and never count as reviews.
create table if not exists public.aspectus_review_drafts (
  reviewer_id uuid not null references public.users(id) on delete cascade,
  submission_id uuid not null references public.learning_submissions(id) on delete cascade,
  org_id uuid not null references public.organisations(id) on delete cascade,
  feedback text not null default '',
  publishing_decision text not null default 'not_reviewed'
    check (publishing_decision in ('not_reviewed','approved_to_publish','needs_changes','do_not_publish')),
  updated_at timestamptz not null default now(),
  primary key (reviewer_id,submission_id),
  constraint aspectus_review_draft_feedback_max_length check (char_length(feedback)<=20000)
);

alter table public.aspectus_review_drafts enable row level security;
grant select,insert,update,delete on public.aspectus_review_drafts to authenticated;

create policy review_draft_select_own on public.aspectus_review_drafts
 for select to authenticated
 using (
   reviewer_id=(select auth.uid())
   and exists (
     select 1 from public.learning_submissions s
     where s.id=aspectus_review_drafts.submission_id
       and s.org_id=aspectus_review_drafts.org_id
       and public.aspectus_can_review_learner(s.org_id,s.learner_id)
   )
 );

create policy review_draft_insert_own_pending on public.aspectus_review_drafts
 for insert to authenticated
 with check (
   reviewer_id=(select auth.uid())
   and exists (
     select 1 from public.learning_submissions s
     where s.id=aspectus_review_drafts.submission_id
       and s.org_id=aspectus_review_drafts.org_id
       and s.status='submitted'
       and public.aspectus_can_review_learner(s.org_id,s.learner_id)
   )
 );

create policy review_draft_update_own_pending on public.aspectus_review_drafts
 for update to authenticated
 using (
   reviewer_id=(select auth.uid())
   and exists (
     select 1 from public.learning_submissions s
     where s.id=aspectus_review_drafts.submission_id
       and s.org_id=aspectus_review_drafts.org_id
       and s.status='submitted'
       and public.aspectus_can_review_learner(s.org_id,s.learner_id)
   )
 )
 with check (
   reviewer_id=(select auth.uid())
   and exists (
     select 1 from public.learning_submissions s
     where s.id=aspectus_review_drafts.submission_id
       and s.org_id=aspectus_review_drafts.org_id
       and s.status='submitted'
       and public.aspectus_can_review_learner(s.org_id,s.learner_id)
   )
 );

create policy review_draft_delete_own on public.aspectus_review_drafts
 for delete to authenticated
 using (reviewer_id=(select auth.uid()));

create or replace function public.aspectus_touch_review_draft()
 returns trigger language plpgsql set search_path='' as $fn$
 begin
   new.updated_at=now();
   return new;
 end; $fn$;
create trigger aspectus_touch_review_draft_timestamp
 before update on public.aspectus_review_drafts
 for each row execute function public.aspectus_touch_review_draft();

create or replace function public.aspectus_clear_submitted_review_drafts()
 returns trigger language plpgsql set search_path='' as $fn$
 begin
   delete from public.aspectus_review_drafts where submission_id=new.id;
   return new;
 end; $fn$;
create trigger aspectus_clear_submitted_review_drafts_on_decision
 after update of status on public.learning_submissions
 for each row when (old.status='submitted' and new.status<>'submitted')
 execute function public.aspectus_clear_submitted_review_drafts();
