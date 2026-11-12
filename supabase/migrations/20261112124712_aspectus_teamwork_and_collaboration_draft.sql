-- Draft only: no learner assignments are created by this migration.
insert into public.modules (org_id,title,description,order_index,is_active,track_id,slug)
select t.org_id,
       'Teamwork & Collaboration',
       'Work together when everyone wears multiple hats. Practice clear handovers, shared ownership, and checking understanding. Pilot prototype: baseline + practical handover lesson.',
       10,
       false,
       t.id,
       'teamwork-and-collaboration'
from public.learning_tracks t
where t.slug='professional-skills'
on conflict (org_id,slug) where slug is not null do nothing;

