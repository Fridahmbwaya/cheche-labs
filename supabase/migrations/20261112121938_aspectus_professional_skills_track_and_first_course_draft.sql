create table if not exists public.learning_tracks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  slug text not null,
  title text not null,
  summary text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(org_id,slug),
  constraint learning_tracks_slug_check check (slug ~ '^[a-z][a-z0-9-]{1,63}$')
);
alter table public.learning_tracks enable row level security;
revoke all on public.learning_tracks from anon,authenticated;
grant select on public.learning_tracks to authenticated;
drop policy if exists learning_tracks_org_read on public.learning_tracks;
create policy learning_tracks_org_read on public.learning_tracks for select to authenticated using (
  org_id=public.my_org_id()
);
alter table public.modules add column if not exists track_id uuid references public.learning_tracks(id);
alter table public.modules add column if not exists slug text;
create unique index if not exists modules_org_slug_unique on public.modules(org_id,slug) where slug is not null;

insert into public.learning_tracks(org_id,slug,title,summary,sort_order)
select distinct org_id,'aspectus-onboarding','Aspectus Onboarding',
 'Role-specific knowledge of our organization, products and operating model.',1
from public.modules where description='Aspectus Week 1 onboarding'
on conflict(org_id,slug) do nothing;
insert into public.learning_tracks(org_id,slug,title,summary,sort_order)
select distinct org_id,'professional-skills','Professional Skills',
 'Practical communication, teamwork and leadership skills for every role.',2
from public.modules where description='Aspectus Week 1 onboarding'
on conflict(org_id,slug) do nothing;

update public.modules m set track_id=t.id
from public.learning_tracks t
where m.org_id=t.org_id and t.slug='aspectus-onboarding'
  and m.description='Aspectus Week 1 onboarding' and m.track_id is null;

insert into public.modules(org_id,title,description,order_index,is_active,track_id,slug)
select t.org_id,'Clear Workplace Communication',
 'Communicate clearly. Build trust. Move work forward. Professional Skills pilot · 60 minutes · five lessons plus baseline. Draft: baseline and Lesson 1 are in preview.',9,false,t.id,'clear-workplace-communication'
from public.learning_tracks t where t.slug='professional-skills'
on conflict (org_id,slug) where slug is not null do nothing;
