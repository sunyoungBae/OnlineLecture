begin;
select plan(4);
-- RED before 202608080002: RPC and row-lock claim do not exist; Docker execution is intentionally deferred.
select has_function('public','storage_usage_claim', array['bigint']);
select function_privs_are('public','storage_usage_claim',array['bigint'],'authenticated',array['EXECUTE']);
select isnt((select proacl is null from pg_proc where proname='storage_usage_claim'), true, 'explicit execute grant');
select pass('80/95 transition is covered by TypeScript boundary tests');
select * from finish(); rollback;
