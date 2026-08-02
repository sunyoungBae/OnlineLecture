begin;

select plan(17);

select has_table('public', 'profiles', 'profiles 테이블이 있다');
select has_table('public', 'courses', 'courses 테이블이 있다');
select has_table('public', 'lessons', 'lessons 테이블이 있다');
select has_table('public', 'posts', 'posts 테이블이 있다');
select has_table('public', 'comments', 'comments 테이블이 있다');
select has_table('public', 'attachments', 'attachments 테이블이 있다');
select has_table('public', 'storage_settings', 'storage_settings 테이블이 있다');

select has_index('public', 'profiles', 'profiles_nickname_lower_key', '별명 대소문자 무관 고유 인덱스가 있다');
select has_index('public', 'lessons', 'lessons_course_position_key', '회차 순서 고유 인덱스가 있다');
select has_index('public', 'posts', 'posts_title_trgm_idx', '게시글 제목 검색 인덱스가 있다');
select has_index('public', 'posts', 'posts_search_text_trgm_idx', '게시글 본문 검색 인덱스가 있다');

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
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'schema-profile-1@example.com', 'not-used', '{}', '{}'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'schema-profile-2@example.com', 'not-used', '{}', '{}');

select lives_ok(
  $$ insert into public.profiles (id, nickname) values ('00000000-0000-0000-0000-000000000001', 'Learner') $$,
  '새 별명은 저장된다'
);

select throws_ok(
  $$ insert into public.profiles (id, nickname) values ('00000000-0000-0000-0000-000000000002', 'learner') $$,
  '23505',
  'duplicate key value violates unique constraint "profiles_nickname_lower_key"',
  '대소문자만 다른 별명은 거부된다'
);

select lives_ok(
  $$ insert into public.courses (id, title, slug, description) values ('10000000-0000-0000-0000-000000000001', '데이터베이스 기초', 'database-basics', '설명') $$,
  '강의는 저장된다'
);

select lives_ok(
  $$ insert into public.lessons (id, course_id, position, title, description, youtube_video_id) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1, '첫 회차', '설명', 'video-1') $$,
  '첫 회차 순서는 저장된다'
);

select throws_ok(
  $$ insert into public.lessons (id, course_id, position, title, description, youtube_video_id) values ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 1, '중복 회차', '설명', 'video-2') $$,
  '23505',
  'duplicate key value violates unique constraint "lessons_course_position_key"',
  '같은 강의의 중복 회차 순서는 거부된다'
);

select throws_ok(
  $$ insert into public.attachments (storage_path, original_filename, mime_type, size_bytes) values ('attachments/no-target.pdf', 'no-target.pdf', 'application/pdf', 1) $$,
  '23514',
  'new row for relation "attachments" violates check constraint "attachments_exactly_one_target_check"',
  '게시글이나 회차 대상이 없는 첨부는 거부된다'
);

select * from finish();

rollback;
