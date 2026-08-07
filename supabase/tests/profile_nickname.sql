begin;

select plan(8);

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
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nickname-check-1@example.com', 'not-used', '{}', '{}'),
  ('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nickname-check-2@example.com', 'not-used', '{}', '{}'),
  ('70000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nickname-check-3@example.com', 'not-used', '{}', '{}'),
  ('70000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nickname-check-4@example.com', 'not-used', '{}', '{}'),
  ('70000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nickname-check-5@example.com', 'not-used', '{}', '{}'),
  ('70000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nickname-check-6@example.com', 'not-used', '{}', '{}'),
  ('70000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nickname-check-7@example.com', 'not-used', '{}', '{}');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$ insert into public.profiles (id, nickname) values ('70000000-0000-0000-0000-000000000001', '한글_English99') $$,
  '허용된 형식의 별명은 직접 INSERT할 수 있다'
);

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000007', true);
select lives_ok(
  $$ insert into public.profiles (id, nickname) values ('70000000-0000-0000-0000-000000000007', '12345678901234567890') $$,
  '정확히 20자 별명은 직접 INSERT할 수 있다'
);

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$ insert into public.profiles (id, nickname) values ('70000000-0000-0000-0000-000000000002', '가') $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_nickname_format_check"',
  '2자보다 짧은 별명을 직접 INSERT하면 거부한다'
);

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000003', true);
select throws_ok(
  $$ insert into public.profiles (id, nickname) values ('70000000-0000-0000-0000-000000000003', 'invalid-name') $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_nickname_format_check"',
  '허용하지 않은 문자가 있는 별명을 직접 INSERT하면 거부한다'
);

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000004', true);
select throws_ok(
  $$ insert into public.profiles (id, nickname) values ('70000000-0000-0000-0000-000000000004', '123456789012345678901') $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_nickname_format_check"',
  '정확히 21자 별명을 직접 INSERT하면 거부한다'
);

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$ update public.profiles set nickname = 'with space' where id = '70000000-0000-0000-0000-000000000001' $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_nickname_format_check"',
  '허용하지 않은 문자가 있는 별명을 직접 UPDATE하면 거부한다'
);

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000005', true);
select lives_ok(
  $$ insert into public.profiles (id, nickname) values ('70000000-0000-0000-0000-000000000005', 'Learner') $$,
  '고유한 영문 별명은 직접 INSERT할 수 있다'
);

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000006', true);
select throws_ok(
  $$ insert into public.profiles (id, nickname) values ('70000000-0000-0000-0000-000000000006', 'learner') $$,
  '23505',
  'duplicate key value violates unique constraint "profiles_nickname_lower_key"',
  '대소문자만 다른 별명은 직접 INSERT하면 거부한다'
);

select * from finish();

rollback;
