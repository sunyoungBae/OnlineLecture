begin;

select plan(11);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
values
  ('91000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'move-member@example.invalid', 'not-used', '{}', '{}'),
  ('91000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'move-admin@example.invalid', 'not-used', '{}', '{}');
insert into public.profiles (id, nickname, role) values
  ('91000000-0000-0000-0000-000000000001', '이동회원', 'member'),
  ('91000000-0000-0000-0000-000000000002', '이동관리자', 'admin');
insert into public.courses (id, title, slug) values
  ('92000000-0000-0000-0000-000000000001', '순서 강의', 'order-course'),
  ('92000000-0000-0000-0000-000000000002', '다른 강의', 'other-course');
insert into public.lessons (id, course_id, position, title, youtube_video_id) values
  ('93000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', 1, '첫 회차', 'dQw4w9WgXcQ'),
  ('93000000-0000-0000-0000-000000000002', '92000000-0000-0000-0000-000000000001', 2, '중간 회차', '9bZkp7q19f0'),
  ('93000000-0000-0000-0000-000000000003', '92000000-0000-0000-0000-000000000001', 3, '마지막 회차', '3JZ_D3ELwOQ'),
  ('93000000-0000-0000-0000-000000000004', '92000000-0000-0000-0000-000000000002', 1, '다른 강의 회차', 'dQw4w9WgXcQ');

select ok(to_regprocedure('public.move_lesson(uuid,text)') is not null, '원자 회차 이동 RPC가 있다');
select is((select prosecdef from pg_proc where oid = to_regprocedure('public.move_lesson(uuid,text)')), true, 'RPC는 SECURITY DEFINER다');
select ok(not has_function_privilege('anon', 'public.move_lesson(uuid,text)', 'execute'), 'anon은 RPC를 실행할 수 없다');
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000001', true);
select throws_ok($$ select public.move_lesson('93000000-0000-0000-0000-000000000002', 'up') $$, '42501', null, '회원은 RPC를 실행할 수 없다');
set local role postgres;
set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000002', true);
select is(public.move_lesson('93000000-0000-0000-0000-000000000002', 'up'), true, '관리자는 중간 회차를 위로 이동한다');
select results_eq($$ select position from public.lessons where id = '93000000-0000-0000-0000-000000000002' $$, $$ values (1::integer) $$, '중간 회차 position이 교환된다');
select is(public.move_lesson('93000000-0000-0000-0000-000000000002', 'down'), true, '관리자는 중간 회차를 아래로 이동한다');
select is(public.move_lesson('93000000-0000-0000-0000-000000000001', 'up'), false, '첫 회차 위 이동은 no-op이다');
select is(public.move_lesson('93000000-0000-0000-0000-000000000003', 'down'), false, '마지막 회차 아래 이동은 no-op이다');
select results_eq($$ select position from public.lessons where course_id = '92000000-0000-0000-0000-000000000002' $$, $$ values (1::integer) $$, '다른 강의 position은 변하지 않는다');
select is((select count(*) from public.lessons where course_id = '92000000-0000-0000-0000-000000000001'), 3::bigint, '같은 강의의 회차 수와 유일성이 보존된다');

select * from finish();
rollback;
