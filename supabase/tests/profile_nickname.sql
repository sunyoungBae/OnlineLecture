begin;

select plan(6);

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
  ('70000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nickname-check-6@example.com', 'not-used', '{}', '{}');

select lives_ok(
  $$ insert into public.profiles (id, nickname) values ('70000000-0000-0000-0000-000000000001', '한글_English99') $$,
  '허용된 형식의 별명은 직접 INSERT할 수 있다'
);

select throws_ok(
  $$ insert into public.profiles (id, nickname) values ('70000000-0000-0000-0000-000000000002', '가') $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_nickname_format_check"',
  '2자보다 짧은 별명을 직접 INSERT하면 거부한다'
);

select throws_ok(
  $$ insert into public.profiles (id, nickname) values ('70000000-0000-0000-0000-000000000003', 'invalid-name') $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_nickname_format_check"',
  '허용하지 않은 문자가 있는 별명을 직접 INSERT하면 거부한다'
);

select throws_ok(
  $$ insert into public.profiles (id, nickname) values ('70000000-0000-0000-0000-000000000004', '가나다라마바사라마바사라마바사라마바사라마바사라마바사라마바사라마바사라마바사라마바사') $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_nickname_format_check"',
  '20자를 초과한 별명을 직접 INSERT하면 거부한다'
);

select throws_ok(
  $$ update public.profiles set nickname = 'with space' where id = '70000000-0000-0000-0000-000000000001' $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_nickname_format_check"',
  '허용하지 않은 문자가 있는 별명을 직접 UPDATE하면 거부한다'
);

select lives_ok(
  $$ insert into public.profiles (id, nickname) values ('70000000-0000-0000-0000-000000000005', 'Learner') $$,
  '고유한 영문 별명은 직접 INSERT할 수 있다'
);

select throws_ok(
  $$ insert into public.profiles (id, nickname) values ('70000000-0000-0000-0000-000000000006', 'learner') $$,
  '23505',
  'duplicate key value violates unique constraint "profiles_nickname_lower_key"',
  '대소문자만 다른 별명은 직접 INSERT하면 거부한다'
);

select * from finish();

rollback;
