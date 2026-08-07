create table private.admin_bootstrap (
  id boolean primary key default true check (id),
  promoted_profile_id uuid not null unique references public.profiles (id) on delete restrict,
  promoted_at timestamptz not null default timezone('utc', now())
);

revoke all on table private.admin_bootstrap from public, anon, authenticated, service_role;

create function private.bootstrap_first_admin(target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('online_lecture_admin_bootstrap'));

  if exists (select 1 from private.admin_bootstrap) then
    raise exception '관리자 bootstrap은 이미 완료되었습니다' using errcode = '55000';
  end if;

  update public.profiles
  set role = 'admin'
  where id = target_profile_id
    and role = 'member';

  if not found then
    raise exception '관리자 승격 대상은 member 프로필이어야 합니다' using errcode = 'P0001';
  end if;

  insert into private.admin_bootstrap (promoted_profile_id)
  values (target_profile_id);
end;
$$;

revoke all on function private.bootstrap_first_admin(uuid) from public, anon, authenticated, service_role;
