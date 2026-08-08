-- P06-T04: row-locked reservations prevent concurrent uploads from bypassing 95%.
alter table public.storage_settings add column reserved_bytes bigint not null default 0 check (reserved_bytes >= 0);
create or replace function public.storage_usage_claim(p_incoming_bytes bigint default 0)
returns table (usage_bytes bigint, quota_bytes bigint, upload_allowed boolean, warning_claimed boolean)
language plpgsql security definer set search_path = public as $$
declare v_usage bigint; v_setting public.storage_settings%rowtype;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_incoming_bytes < 0 then raise exception 'invalid bytes'; end if;
  select * into v_setting from public.storage_settings where id = true for update;
  select coalesce(sum(size_bytes),0) into v_usage from public.attachments;
  if v_usage < v_setting.quota_bytes * 0.75 and v_setting.warning_state = 'sent' then
    update public.storage_settings set warning_state = 'armed', last_warning_email_sent_at = null where id = true;
    v_setting.warning_state := 'armed';
  end if;
  upload_allowed := v_usage + v_setting.reserved_bytes + p_incoming_bytes < v_setting.quota_bytes * 0.95;
  warning_claimed := upload_allowed and v_usage + v_setting.reserved_bytes + p_incoming_bytes >= v_setting.quota_bytes * 0.8 and v_setting.warning_state = 'armed';
  if warning_claimed then update public.storage_settings set warning_state = 'sent', last_warning_email_sent_at = timezone('utc',now()) where id = true; end if;
  if upload_allowed and p_incoming_bytes > 0 then update public.storage_settings set reserved_bytes = reserved_bytes + p_incoming_bytes where id = true; end if;
  usage_bytes := v_usage; quota_bytes := v_setting.quota_bytes; return next;
end $$;
create or replace function public.storage_usage_release(p_reserved_bytes bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_reserved_bytes < 0 then raise exception 'invalid release'; end if;
  update public.storage_settings set reserved_bytes = greatest(0, reserved_bytes - p_reserved_bytes) where id = true;
end $$;
create or replace function public.storage_warning_send_failed()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update public.storage_settings set warning_state = 'armed', last_warning_email_sent_at = null where id = true and warning_state = 'sent';
end $$;
revoke all on function public.storage_usage_claim(bigint) from public;
grant execute on function public.storage_usage_claim(bigint) to authenticated;
grant execute on function public.storage_usage_release(bigint), public.storage_warning_send_failed() to authenticated;
