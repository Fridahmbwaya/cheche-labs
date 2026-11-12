
-- Optional work email kept separately from the verified login email.
-- Supabase Auth still verifies the login email. This does not create a second app account.
alter table public.users add column if not exists work_email text;
alter table public.aspectus_pending_accounts add column if not exists work_email text;

create or replace function public.aspectus_set_pending_work_email(p_email text,p_work_email text)
returns boolean language plpgsql security definer set search_path='' as $fn$
declare v_org uuid; v_login text; v_work text;
begin
  select org_id into v_org from public.users
  where id=(select auth.uid()) and is_active;
  if v_org is null or not public.aspectus_can_admin(v_org) then
    raise exception 'Account administrator access required' using errcode='42501';
  end if;
  v_login:=lower(pg_catalog.btrim(coalesce(p_email,'')));
  v_work:=nullif(lower(pg_catalog.btrim(coalesce(p_work_email,''))),'');
  if v_work is not null and (length(v_work)>254 or
     v_work !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') then
    raise exception 'Enter a valid work email' using errcode='22023';
  end if;
  update public.aspectus_pending_accounts
     set work_email=v_work where email=v_login and org_id=v_org;
  if not found then
    raise exception 'Pending invitation not found for your organization' using errcode='22023';
  end if;
  return true;
end;
$fn$;
revoke all on function public.aspectus_set_pending_work_email(text,text) from public,anon;
grant execute on function public.aspectus_set_pending_work_email(text,text) to authenticated;

-- Preserve all existing invitation, role, and module-claim behavior.
-- The verified login email is the lookup key; work_email is metadata only.
create or replace function public.aspectus_claim_pending_account() returns boolean
language plpgsql security definer set search_path='' as $fn$
declare v_email text; p public.aspectus_pending_accounts%rowtype;
begin
 if auth.uid() is null then return false; end if;
 select lower(email) into v_email from auth.users
 where id=auth.uid() and email_confirmed_at is not null;
 if v_email is null then return false; end if;
 select * into p from public.aspectus_pending_accounts where lower(email)=v_email;
 if not found then return false; end if;

 insert into public.users(id,org_id,email,full_name,role,work_email)
 values(auth.uid(),p.org_id,v_email,p.full_name,p.role,p.work_email)
 on conflict(id) do nothing;

 if not exists(select 1 from public.users
   where id=auth.uid() and org_id=p.org_id) then return false; end if;

 insert into public.aspectus_module_assignments(org_id,learner_id,module_id)
 select p.org_id,auth.uid(),pm.module_id
 from public.aspectus_pending_module_assignments pm
 where lower(pm.email)=v_email and pm.org_id=p.org_id
 on conflict(learner_id,module_id) do nothing;

 if p.role='manager' then
  insert into public.aspectus_reviewer_assignments(org_id,reviewer_id,learner_id)
  select p.org_id,auth.uid(),pr.learner_id
  from public.aspectus_pending_reviewer_assignments pr
  where lower(pr.email)=v_email and pr.org_id=p.org_id
  on conflict(org_id,reviewer_id,learner_id) do nothing;
 end if;
 return true;
end;
$fn$;

