-- Personal photos are intentionally separate from private assignment uploads.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('aspectus-avatars','aspectus-avatars',false,2097152,array['image/jpeg','image/png','image/webp']::text[])
on conflict (id) do update
 set public=false, file_size_limit=2097152, allowed_mime_types=excluded.allowed_mime_types;

create policy aspectus_avatar_insert_self on storage.objects
for insert to authenticated with check (
  bucket_id='aspectus-avatars'
  and split_part(name,'/',1)=(select auth.uid())::text
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp')
  and exists(select 1 from public.users u where u.id=(select auth.uid()) and u.is_active)
);

create policy aspectus_avatar_select_org on storage.objects
for select to authenticated using (
 bucket_id='aspectus-avatars'
 and exists (
   select 1 from public.users viewer
   join public.users owner
     on owner.org_id=viewer.org_id
   where viewer.id=(select auth.uid()) and viewer.is_active
     and owner.id::text=split_part(storage.objects.name,'/',1) and owner.is_active
 )
);

create policy aspectus_avatar_delete_self on storage.objects
for delete to authenticated using (
  bucket_id='aspectus-avatars'
  and split_part(name,'/',1)=(select auth.uid())::text
);

create or replace function public.aspectus_set_my_avatar(p_storage_path text)
returns text
language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid := auth.uid();
  v_path text := nullif(trim(p_storage_path),'');
begin
  if v_uid is null or not exists (select 1 from public.users where id=v_uid and is_active) then
    raise exception 'An active account is required';
  end if;
  if v_path is not null then
    if length(v_path)>180 or split_part(v_path,'/',1)<>v_uid::text
      or v_path !~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{8,80}\.(png|jpg|jpeg|webp)$'
    then raise exception 'Invalid profile photo path'; end if;
    if not exists(select 1 from storage.objects where bucket_id='aspectus-avatars' and name=v_path)
    then raise exception 'Profile photo is not uploaded'; end if;
  end if;
  update public.users set avatar_url=v_path,updated_at=now() where id=v_uid;
  return v_path;
end $$;
revoke all on function public.aspectus_set_my_avatar(text) from public,anon;
grant execute on function public.aspectus_set_my_avatar(text) to authenticated;
