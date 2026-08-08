-- P06-T04: server paths call these functions with the authenticated user context.
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
  upload_allowed := v_usage + p_incoming_bytes < v_setting.quota_bytes * 0.95;
  warning_claimed := upload_allowed and v_usage + p_incoming_bytes >= v_setting.quota_bytes * 0.8 and v_setting.warning_state = 'armed';
  if warning_claimed then update public.storage_settings set warning_state = 'sent', last_warning_email_sent_at = timezone('utc',now()) where id = true; end if;
  usage_bytes := v_usage; quota_bytes := v_setting.quota_bytes; return next;
end $$;
revoke all on function public.storage_usage_claim(bigint) from public;
grant execute on function public.storage_usage_claim(bigint) to authenticated;
