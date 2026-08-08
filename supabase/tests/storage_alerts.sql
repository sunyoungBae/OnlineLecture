begin;
select plan(22);

select has_function('public', 'storage_usage_claim', array['bigint']);
select has_function('public', 'storage_usage_release', array['uuid']);
select has_function('public', 'storage_warning_send_failed', array[]::text[]);
select function_privs_are('public', 'storage_usage_claim', array['bigint'], 'anon', array[]::text[]);
select function_privs_are('public', 'storage_usage_claim', array['bigint'], 'authenticated', array[]::text[]);
select function_privs_are('public', 'storage_usage_claim', array['bigint'], 'service_role', array['EXECUTE']);
select function_privs_are('public', 'storage_usage_release', array['uuid'], 'authenticated', array[]::text[]);
select function_privs_are('public', 'storage_warning_send_failed', array[]::text[], 'authenticated', array[]::text[]);

select set_config('request.jwt.claim.role', 'service_role', true);
select lives_ok($$ select * from public.storage_usage_claim(0) $$, 'service role은 직접 claim할 수 있다');

update public.storage_settings set quota_bytes = 100, reserved_bytes = 0, warning_state = 'armed', last_warning_email_sent_at = null where id = true;
delete from public.storage_reservations;
select is((select warning_claimed from public.storage_usage_claim(80)), true, '80% 최초 claim');
select is((select warning_claimed from public.storage_usage_claim(0)), false, 'sent 상태는 중복 claim하지 않음');

update public.storage_settings set reserved_bytes = 0, warning_state = 'armed' where id = true;
delete from public.storage_reservations;
select is((select upload_allowed from public.storage_usage_claim(95)), false, '95%는 차단');

update public.storage_settings set reserved_bytes = 0, warning_state = 'armed' where id = true;
delete from public.storage_reservations;
select is((select upload_allowed from public.storage_usage_claim(79)), true, '79%는 허용');
update public.storage_settings set reserved_bytes = 0, warning_state = 'armed' where id = true;
delete from public.storage_reservations;
select is((select upload_allowed from public.storage_usage_claim(94)), true, '94%는 허용');

update public.storage_settings set warning_state = 'sent', reserved_bytes = 0 where id = true;
delete from public.storage_reservations;
select is((select warning_claimed from public.storage_usage_claim(0)), false, '75% 아래 재무장 sync은 새 경고를 claim하지 않는다');
select is((select warning_state from public.storage_settings where id = true), 'armed', '75% 아래 실제 warning_state가 재무장된다');

update public.storage_settings set reserved_bytes = 0, warning_state = 'armed' where id = true;
delete from public.storage_reservations;
select is((select public.storage_usage_release(reservation_id) from public.storage_usage_claim(10)), true, 'claim token은 한 번만 해제된다');
select is((select reserved_bytes from public.storage_settings where id = true), 0::bigint, 'token 해제 뒤 예약 바이트는 0이다');

select ok((select count(*) from pg_proc where proname = 'storage_usage_claim' and prosrc like '%for update%'), 'claim locks settings row for concurrency');
select ok((select count(*) from pg_proc where proname = 'storage_usage_claim' and prosrc like '%reserved_bytes%'), 'claim includes reservations');
select ok((select count(*) from pg_proc where proname = 'storage_usage_release' and prosrc like '%storage_reservations%'), 'release is token-scoped');

select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok($$ select * from public.storage_usage_claim(0) $$, 'P0001', 'service role required', '회원 역할의 직접 claim은 거부된다');

select * from finish();
rollback;
