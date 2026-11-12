
alter table public.aspectus_pending_accounts
  drop constraint if exists aspectus_pending_accounts_role_check;
alter table public.aspectus_pending_accounts
  add constraint aspectus_pending_accounts_role_check
    check(role in ('employee','manager','org_admin'));

