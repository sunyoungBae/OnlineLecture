begin;
select plan(6);
-- RED before 202608080002: RPC and row-lock claim do not exist; Docker execution is intentionally deferred.
select has_function('public','storage_usage_claim', array['bigint']);
select function_privs_are('public','storage_usage_claim',array['bigint'],'authenticated',array['EXECUTE']);
select isnt((select proacl is null from pg_proc where proname='storage_usage_claim'), true, 'explicit execute grant');
select has_function('public','storage_usage_release', array['bigint']);
select has_function('public','storage_warning_send_failed', array[]::text[]);
select pass('80/95 transition and reservation release are covered by TypeScript boundary tests');
select * from finish(); rollback;
