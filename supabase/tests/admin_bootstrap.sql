begin;

select plan(15);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  raw_app_meta_data,
  raw_user_meta_data
)
values
  ('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bootstrap-member@example.invalid', 'not-used', '{}', '{}'),
  ('80000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bootstrap-existing-admin@example.invalid', 'not-used', '{}', '{}'),
  ('80000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bootstrap-second-member@example.invalid', 'not-used', '{}', '{}');

insert into public.profiles (id, nickname, role)
values
  ('80000000-0000-0000-0000-000000000001', '승격대상', 'member'),
  ('80000000-0000-0000-0000-000000000002', '기존관리자', 'admin'),
  ('80000000-0000-0000-0000-000000000003', '두번째대상', 'member');

select ok(
  to_regprocedure('private.bootstrap_first_admin(uuid)') is not null,
  '1회 관리자 승격 함수가 있다'
);
select is(
  (select prosecdef from pg_proc where oid = to_regprocedure('private.bootstrap_first_admin(uuid)')),
  true,
  '1회 관리자 승격 함수는 SECURITY DEFINER다'
);
select ok(
  coalesce((select proconfig @> array['search_path=""'] from pg_proc where oid = to_regprocedure('private.bootstrap_first_admin(uuid)')), false),
  '1회 관리자 승격 함수는 빈 search_path를 고정한다'
);
select ok(
  not coalesce((select has_function_privilege('anon', oid, 'execute') from pg_proc where oid = to_regprocedure('private.bootstrap_first_admin(uuid)')), false),
  'anon은 1회 관리자 승격 함수를 실행할 수 없다'
);
select ok(
  not coalesce((select has_function_privilege('authenticated', oid, 'execute') from pg_proc where oid = to_regprocedure('private.bootstrap_first_admin(uuid)')), false),
  'authenticated는 1회 관리자 승격 함수를 실행할 수 없다'
);
select ok(
  not coalesce((select has_function_privilege('service_role', oid, 'execute') from pg_proc where oid = to_regprocedure('private.bootstrap_first_admin(uuid)')), false),
  'service_role은 1회 관리자 승격 함수를 실행할 수 없다'
);

select throws_ok(
  $$ select private.bootstrap_first_admin('80000000-0000-0000-0000-000000000099') $$,
  'P0001',
  '관리자 승격 대상은 member 프로필이어야 합니다',
  '없는 프로필 승격은 거부한다'
);
select is_empty(
  $$ select 1 from private.admin_bootstrap $$,
  '없는 프로필 승격 실패는 이력을 남기지 않는다'
);
select throws_ok(
  $$ select private.bootstrap_first_admin('80000000-0000-0000-0000-000000000002') $$,
  'P0001',
  '관리자 승격 대상은 member 프로필이어야 합니다',
  '이미 admin인 프로필은 bootstrap 대상으로 승격할 수 없다'
);
select is_empty(
  $$ select 1 from private.admin_bootstrap $$,
  '이미 admin인 프로필 승격 실패는 이력을 남기지 않는다'
);
select lives_ok(
  $$ select private.bootstrap_first_admin('80000000-0000-0000-0000-000000000001') $$,
  'member 프로필 하나를 관리자 bootstrap으로 승격한다'
);
select results_eq(
  $$ select role from public.profiles where id = '80000000-0000-0000-0000-000000000001' $$,
  $$ values ('admin'::text) $$,
  'bootstrap 대상 프로필은 admin이 된다'
);
select results_eq(
  $$ select promoted_profile_id from private.admin_bootstrap $$,
  $$ values ('80000000-0000-0000-0000-000000000001'::uuid) $$,
  '승격 이력은 대상 프로필 ID만 기록한다'
);
select throws_ok(
  $$ select private.bootstrap_first_admin('80000000-0000-0000-0000-000000000003') $$,
  '55000',
  '관리자 bootstrap은 이미 완료되었습니다',
  '두 번째 bootstrap 호출은 거부한다'
);
select results_eq(
  $$ select role from public.profiles where id = '80000000-0000-0000-0000-000000000003' $$,
  $$ values ('member'::text) $$,
  '두 번째 대상은 member로 남아 원자적 실패를 보장한다'
);

select * from finish();

rollback;
