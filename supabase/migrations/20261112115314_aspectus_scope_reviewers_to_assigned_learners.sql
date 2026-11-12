
create table if not exists public.aspectus_reviewer_assignments (
 org_id uuid not null references public.organisations(id) on delete cascade,
 reviewer_id uuid not null references public.users(id) on delete cascade,
 learner_id uuid not null references public.users(id) on delete cascade,
 assigned_by uuid references public.users(id),
 created_at timestamptz not null default now(),
 primary key(org_id,reviewer_id,learner_id),
 constraint aspectus_reviewer_distinct check(reviewer_id<>learner_id)
);
create index if not exists aspectus_reviewer_by_learner on public.aspectus_reviewer_assignments(org_id,learner_id);
alter table public.aspectus_reviewer_assignments enable row level security;
revoke all on public.aspectus_reviewer_assignments from anon, authenticated;
grant select on public.aspectus_reviewer_assignments to authenticated;
drop policy if exists reviewer_assignments_read on public.aspectus_reviewer_assignments;
create policy reviewer_assignments_read on public.aspectus_reviewer_assignments for select to authenticated using (reviewer_id=(select auth.uid()) or public.aspectus_can_admin(org_id));

create table if not exists public.aspectus_pending_reviewer_assignments (
 org_id uuid not null references public.organisations(id) on delete cascade,
 email text not null references public.aspectus_pending_accounts(email) on delete cascade,
 learner_id uuid not null references public.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(org_id,email,learner_id)
);
alter table public.aspectus_pending_reviewer_assignments enable row level security;
revoke all on public.aspectus_pending_reviewer_assignments from anon, authenticated;
grant select on public.aspectus_pending_reviewer_assignments to authenticated;
drop policy if exists pending_reviewers_admin_read on public.aspectus_pending_reviewer_assignments;
create policy pending_reviewers_admin_read on public.aspectus_pending_reviewer_assignments for select to authenticated using (public.aspectus_can_admin(org_id));

create or replace function public.aspectus_can_review_learner(p_org_id uuid,p_learner_id uuid) returns boolean
language sql stable security definer set search_path = '' as $fn$
 select (select auth.uid()) is not null and exists(
  select 1 from public.users viewer
  where viewer.id=(select auth.uid()) and viewer.org_id=p_org_id and viewer.is_active
   and (
     viewer.role='org_admin'
     or (viewer.role in ('manager','hr_manager') and exists (
        select 1 from public.aspectus_reviewer_assignments a
        where a.org_id=p_org_id and a.reviewer_id=viewer.id and a.learner_id=p_learner_id
     ))
   )
 );
$fn$;
create or replace function public.aspectus_can_access_learner(p_org_id uuid,p_learner_id uuid) returns boolean
language sql stable security definer set search_path = '' as $fn$
 select (select auth.uid()) is not null and (
    exists(select 1 from public.users u where u.id=(select auth.uid()) and u.id=p_learner_id and u.org_id=p_org_id and u.is_active)
    or public.aspectus_can_review_learner(p_org_id,p_learner_id)
 );
$fn$;

create or replace function public.aspectus_set_reviewer_learners(p_reviewer_id uuid,p_learner_ids uuid[]) returns boolean
language plpgsql security definer set search_path='' as $fn$
declare v_org uuid; v_ids uuid[];
begin
 select org_id into v_org from public.users where id=(select auth.uid()) and is_active;
 if v_org is null or not public.aspectus_can_admin(v_org) then
  raise exception 'Account admin access required' using errcode='42501';
 end if;
 if not exists(select 1 from public.users where id=p_reviewer_id and org_id=v_org and role in ('manager','hr_manager') and is_active) then
  raise exception 'Reviewer not found or does not have reviewer role' using errcode='22023';
 end if;
 v_ids:=array(select distinct unnest(coalesce(p_learner_ids,array[]::uuid[])));
 if exists(select 1 from unnest(v_ids) selected(id) where not exists(
   select 1 from public.users u where u.id=selected.id and u.org_id=v_org and u.is_active and u.role='employee'
 )) then
   raise exception 'Only active learners in your organization can be assigned' using errcode='22023';
 end if;
 delete from public.aspectus_reviewer_assignments where org_id=v_org and reviewer_id=p_reviewer_id and not(learner_id=any(v_ids));
 insert into public.aspectus_reviewer_assignments(org_id,reviewer_id,learner_id,assigned_by)
 select v_org,p_reviewer_id,ids.id,(select auth.uid()) from unnest(v_ids) ids(id)
 on conflict(org_id,reviewer_id,learner_id) do nothing;
 return true;
end;
$fn$;
create or replace function public.aspectus_set_pending_reviewees(p_email text,p_learner_ids uuid[]) returns boolean
language plpgsql security definer set search_path='' as $fn$
declare v_org uuid; v_email text; v_ids uuid[];
begin
 select org_id into v_org from public.users where id=(select auth.uid()) and is_active;
 if v_org is null or not public.aspectus_can_admin(v_org) then
  raise exception 'Account admin access required' using errcode='42501';
 end if;
 v_email:=lower(trim(coalesce(p_email,'')));
 if not exists(select 1 from public.aspectus_pending_accounts p where p.email=v_email and p.org_id=v_org and p.role='manager') then
  raise exception 'Pending reviewer invitation not found' using errcode='22023';
 end if;
 v_ids:=array(select distinct unnest(coalesce(p_learner_ids,array[]::uuid[])));
 if exists(select 1 from unnest(v_ids) selected(id) where not exists(
   select 1 from public.users u where u.id=selected.id and u.org_id=v_org and u.is_active and u.role='employee'
 )) then
   raise exception 'Only active learners in your organization can be assigned' using errcode='22023';
 end if;
 delete from public.aspectus_pending_reviewer_assignments where org_id=v_org and email=v_email and not(learner_id=any(v_ids));
 insert into public.aspectus_pending_reviewer_assignments(org_id,email,learner_id)
 select v_org,v_email,ids.id from unnest(v_ids) ids(id)
 on conflict(org_id,email,learner_id) do nothing;
 return true;
end;
$fn$;
create or replace function public.aspectus_claim_pending_account() returns boolean
language plpgsql security definer set search_path='' as $fn$
declare v_email text; p public.aspectus_pending_accounts%rowtype;
begin
 if auth.uid() is null then return false; end if;
 select lower(email) into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if v_email is null then return false; end if;
 select * into p from public.aspectus_pending_accounts where lower(email)=v_email;
 if not found then return false; end if;
 insert into public.users(id,org_id,email,full_name,role)
 values(auth.uid(),p.org_id,v_email,p.full_name,p.role) on conflict(id) do nothing;
 if not exists(select 1 from public.users where id=auth.uid() and org_id=p.org_id) then return false; end if;
 insert into public.aspectus_module_assignments(org_id,learner_id,module_id)
 select p.org_id,auth.uid(),pm.module_id from public.aspectus_pending_module_assignments pm
 where lower(pm.email)=v_email and pm.org_id=p.org_id
 on conflict(learner_id,module_id) do nothing;
 if p.role='manager' then
  insert into public.aspectus_reviewer_assignments(org_id,reviewer_id,learner_id)
  select p.org_id,auth.uid(),pr.learner_id from public.aspectus_pending_reviewer_assignments pr
  where lower(pr.email)=v_email and pr.org_id=p.org_id
  on conflict(org_id,reviewer_id,learner_id) do nothing;
 end if;
 return true;
end;
$fn$;

create or replace function public.aspectus_review_submission(
 p_submission_id uuid,p_decision text,p_publishing_decision text,p_feedback text) returns void
language plpgsql security definer set search_path='' as $fn$
declare v_row public.learning_submissions%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_decision is null or p_decision not in ('approved','approved_with_changes','revision_requested') then
  raise exception 'Invalid review decision' using errcode='22023'; end if;
 if p_publishing_decision is null or p_publishing_decision not in
  ('not_reviewed','approved_to_publish','needs_changes','do_not_publish') then
  raise exception 'Invalid publishing decision' using errcode='22023'; end if;
 select * into v_row from public.learning_submissions where id=p_submission_id for update;
 if not found then raise exception 'Submission not found' using errcode='P0002'; end if;
 if not public.aspectus_can_review_learner(v_row.org_id,v_row.learner_id) then
  raise exception 'You are not assigned to review this learner' using errcode='42501'; end if;
 if v_row.status <> 'submitted' then
  raise exception 'This submission was already reviewed' using errcode='22023'; end if;
 if p_decision in ('approved_with_changes','revision_requested')
  and length(pg_catalog.btrim(coalesce(p_feedback,'')))=0 then
   raise exception 'Please add review feedback for requested changes' using errcode='22023'; end if;
 insert into public.learning_reviews
  (submission_id,org_id,manager_id,decision,publishing_decision,feedback,submission_revision_number)
 values(v_row.id,v_row.org_id,(select auth.uid()),p_decision,p_publishing_decision,coalesce(p_feedback,''),v_row.revision_number);
 update public.learning_submissions set status=p_decision,updated_at=now() where id=p_submission_id;
end;
$fn$;
revoke all on function public.aspectus_can_review_learner(uuid,uuid),public.aspectus_can_access_learner(uuid,uuid),
public.aspectus_set_reviewer_learners(uuid,uuid[]),public.aspectus_set_pending_reviewees(text,uuid[]) from public,anon;
grant execute on function public.aspectus_can_review_learner(uuid,uuid),public.aspectus_can_access_learner(uuid,uuid),
public.aspectus_set_reviewer_learners(uuid,uuid[]),public.aspectus_set_pending_reviewees(text,uuid[]) to authenticated;

drop policy if exists aspectus_module_assignments_read on public.aspectus_module_assignments;
create policy aspectus_module_assignments_read on public.aspectus_module_assignments for SELECT to authenticated using ((learner_id=(select auth.uid()) or public.aspectus_can_review_learner(org_id,learner_id))) ;
drop policy if exists aspectus_quiz_attempts_read on public.aspectus_quiz_attempts;
create policy aspectus_quiz_attempts_read on public.aspectus_quiz_attempts for SELECT to authenticated using (public.aspectus_can_access_learner(org_id,learner_id)) ;
drop policy if exists lesson_progress_own_or_manager_read on public.aspectus_lesson_progress;
create policy lesson_progress_own_or_manager_read on public.aspectus_lesson_progress for SELECT to authenticated using (public.aspectus_can_access_learner(org_id,learner_id)) ;
drop policy if exists submissions_read on public.learning_submissions;
create policy submissions_read on public.learning_submissions for SELECT to authenticated using (public.aspectus_can_access_learner(org_id,learner_id)) ;
drop policy if exists submissions_update_manager on public.learning_submissions;
create policy submissions_update_manager on public.learning_submissions for UPDATE to authenticated using (public.aspectus_can_review_learner(org_id,learner_id)) with check (public.aspectus_can_review_learner(org_id,learner_id));
drop policy if exists reviews_read on public.learning_reviews;
create policy reviews_read on public.learning_reviews for SELECT to authenticated using (exists(select 1 from public.learning_submissions s where s.id=submission_id and s.org_id=learning_reviews.org_id and public.aspectus_can_access_learner(s.org_id,s.learner_id))) ;
drop policy if exists reviews_create on public.learning_reviews;
create policy reviews_create on public.learning_reviews for INSERT to authenticated  with check (manager_id=(select auth.uid()) and exists(select 1 from public.learning_submissions s where s.id=submission_id and s.org_id=learning_reviews.org_id and public.aspectus_can_review_learner(s.org_id,s.learner_id)));
drop policy if exists versions_learner_or_manager_read on public.learning_submission_versions;
create policy versions_learner_or_manager_read on public.learning_submission_versions for SELECT to authenticated using (public.aspectus_can_access_learner(org_id,learner_id)) ;
drop policy if exists overrides_select on public.aspectus_module_overrides;
create policy overrides_select on public.aspectus_module_overrides for SELECT to authenticated using (public.aspectus_can_access_learner(org_id,learner_id)) ;
drop policy if exists overrides_insert on public.aspectus_module_overrides;
create policy overrides_insert on public.aspectus_module_overrides for INSERT to authenticated  with check (authorized_by=(select auth.uid()) and public.aspectus_can_review_learner(org_id,learner_id) and exists(select 1 from public.modules m where m.id=module_id and m.org_id=aspectus_module_overrides.org_id));
drop policy if exists self_or_manager_read_users on public.users;
create policy self_or_manager_read_users on public.users for SELECT to authenticated using ((id=(select auth.uid()) or public.aspectus_can_review_learner(org_id,id))) ;
drop policy if exists completions_read on public.module_completions;
create policy completions_read on public.module_completions for SELECT to authenticated using (public.aspectus_can_access_learner(org_id,user_id)) ;
drop policy if exists certificates_read on public.certificates;
create policy certificates_read on public.certificates for SELECT to authenticated using (public.aspectus_can_access_learner(org_id,user_id)) ;
drop policy if exists assignments_read on public.module_assignments;
create policy assignments_read on public.module_assignments for SELECT to authenticated using ((user_id=(select auth.uid()) or exists(select 1 from public.users u where u.id=module_assignments.user_id and public.aspectus_can_review_learner(u.org_id,u.id)))) ;
drop policy if exists progress_read on public.unit_progress;
create policy progress_read on public.unit_progress for SELECT to authenticated using ((user_id=(select auth.uid()) or exists(select 1 from public.users u where u.id=unit_progress.user_id and public.aspectus_can_review_learner(u.org_id,u.id)))) ;
drop policy if exists aspectus_issues_manager_read on public.aspectus_learning_issues;
create policy aspectus_issues_manager_read on public.aspectus_learning_issues for SELECT to authenticated using (public.aspectus_can_admin(org_id) or (reported_by=(select auth.uid())) or (learner_id is not null and public.aspectus_can_review_learner(org_id,learner_id))) ;
drop policy if exists aspectus_issues_manager_update on public.aspectus_learning_issues;
create policy aspectus_issues_manager_update on public.aspectus_learning_issues for UPDATE to authenticated using (public.aspectus_can_admin(org_id) or reported_by=(select auth.uid()) or (learner_id is not null and public.aspectus_can_review_learner(org_id,learner_id))) with check (public.aspectus_can_admin(org_id) or reported_by=(select auth.uid()) or (learner_id is not null and public.aspectus_can_review_learner(org_id,learner_id)));
drop policy if exists aspectus_issues_manager_insert on public.aspectus_learning_issues;
create policy aspectus_issues_manager_insert on public.aspectus_learning_issues for INSERT to authenticated  with check (reported_by=(select auth.uid()) and org_id=public.my_org_id() and public.is_org_manager(org_id) and (learner_id is null or public.aspectus_can_review_learner(org_id,learner_id)) and (module_id is null or exists(select 1 from public.modules m where m.id=module_id and m.org_id=aspectus_learning_issues.org_id)));
drop policy if exists aspectus_files_read on storage.objects;
create policy aspectus_files_read on storage.objects for SELECT to authenticated using (bucket_id='aspectus-assignments' and ((storage.foldername(name))[1]=(select auth.uid())::text or exists(select 1 from public.learning_submissions s where s.deliverable_url='storage://aspectus-assignments/'||name and public.aspectus_can_review_learner(s.org_id,s.learner_id)))) ;
drop policy if exists aspectus_manager_read_multi_attachments on storage.objects;
create policy aspectus_manager_read_multi_attachments on storage.objects for SELECT to authenticated using (bucket_id='aspectus-assignments' and exists(select 1 from public.learning_submissions s where name=any(s.attachment_paths) and public.aspectus_can_review_learner(s.org_id,s.learner_id))) ;
drop policy if exists aspectus_manager_read_archived_attachments on storage.objects;
create policy aspectus_manager_read_archived_attachments on storage.objects for SELECT to authenticated using (bucket_id='aspectus-assignments' and exists(select 1 from public.learning_submission_versions v where (name=any(v.attachment_paths) or v.deliverable_url='storage://aspectus-assignments/'||name) and public.aspectus_can_review_learner(v.org_id,v.learner_id))) ;
