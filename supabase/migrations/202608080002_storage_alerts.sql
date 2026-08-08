-- P06-T04: only server-side service_role calls quota RPCs. A UUID reservation
-- prevents concurrent attachment actions from observing the same free space.
alter table public.storage_settings add column reserved_bytes bigint not null default 0 check (reserved_bytes >= 0);
create table public.storage_reservations (
  id uuid primary key default gen_random_uuid(),
  bytes bigint not null check (bytes > 0),
  created_at timestamptz not null default timezone('utc', now())
);
alter table public.storage_reservations enable row level security;

create or replace function public.storage_usage_claim(p_incoming_bytes bigint default 0)
returns table (reservation_id uuid, usage_bytes bigint, quota_bytes bigint, upload_allowed boolean, warning_claimed boolean)
language plpgsql security definer set search_path = public as $$
declare v_usage bigint; v_setting public.storage_settings%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  if p_incoming_bytes < 0 then raise exception 'invalid bytes'; end if;
  select * into v_setting from public.storage_settings where id = true for update;
  select coalesce(sum(size_bytes), 0) into v_usage from public.attachments;
  if v_usage + v_setting.reserved_bytes < v_setting.quota_bytes * 0.75 and v_setting.warning_state = 'sent' then
    update public.storage_settings set warning_state = 'armed', last_warning_email_sent_at = null where id = true;
    v_setting.warning_state := 'armed';
  end if;
  upload_allowed := v_usage + v_setting.reserved_bytes + p_incoming_bytes < v_setting.quota_bytes * 0.95;
  warning_claimed := upload_allowed and v_usage + v_setting.reserved_bytes + p_incoming_bytes >= v_setting.quota_bytes * 0.8 and v_setting.warning_state = 'armed';
  if warning_claimed then update public.storage_settings set warning_state = 'sent', last_warning_email_sent_at = timezone('utc', now()) where id = true; end if;
  if upload_allowed and p_incoming_bytes > 0 then
    insert into public.storage_reservations(bytes) values (p_incoming_bytes) returning id into reservation_id;
    update public.storage_settings set reserved_bytes = reserved_bytes + p_incoming_bytes where id = true;
  end if;
  usage_bytes := v_usage; quota_bytes := v_setting.quota_bytes; return next;
end $$;

create or replace function public.storage_usage_release(p_reservation_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_bytes bigint;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  delete from public.storage_reservations where id = p_reservation_id returning bytes into v_bytes;
  if v_bytes is null then return false; end if;
  update public.storage_settings set reserved_bytes = greatest(0, reserved_bytes - v_bytes) where id = true;
  return true;
end $$;

create or replace function public.storage_warning_send_failed()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  update public.storage_settings set warning_state = 'armed', last_warning_email_sent_at = null where id = true and warning_state = 'sent';
  return found;
end $$;

revoke all on function public.storage_usage_claim(bigint), public.storage_usage_release(uuid), public.storage_warning_send_failed() from public, anon, authenticated;
grant execute on function public.storage_usage_claim(bigint), public.storage_usage_release(uuid), public.storage_warning_send_failed() to service_role;
