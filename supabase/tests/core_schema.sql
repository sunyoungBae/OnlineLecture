begin;

select plan(29);

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

insert into public.posts (id, author_id, course_id, title, content, search_text)
values (
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '삭제 동작 확인 게시글',
  '{"type":"doc","content":[]}',
  '삭제 동작 확인 게시글'
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

select throws_ok(
  $$ insert into public.attachments (post_id, lesson_id, storage_path, original_filename, mime_type, size_bytes) values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'attachments/two-targets.pdf', 'two-targets.pdf', 'application/pdf', 1) $$,
  '23514',
  'new row for relation "attachments" violates check constraint "attachments_exactly_one_target_check"',
  '게시글과 회차를 동시에 지정한 첨부는 거부된다'
);

select throws_ok(
  $$ insert into public.attachments (lesson_id, storage_path, original_filename, mime_type, size_bytes) values ('20000000-0000-0000-0000-000000000001', 'attachments/empty.pdf', 'empty.pdf', 'application/pdf', 0) $$,
  '23514',
  'new row for relation "attachments" violates check constraint "attachments_size_bytes_check"',
  '0바이트 첨부는 거부된다'
);

select lives_ok(
  $$ insert into public.attachments (lesson_id, storage_path, original_filename, mime_type, size_bytes) values ('20000000-0000-0000-0000-000000000001', 'attachments/lesson.pdf', 'lesson.pdf', 'application/pdf', 1024) $$,
  '회차에 연결된 정상 첨부는 저장된다'
);

select throws_ok(
  $$ insert into public.storage_settings (id) values (true) $$,
  '23505',
  'duplicate key value violates unique constraint "storage_settings_pkey"',
  '저장 설정은 singleton을 유지한다'
);

select throws_ok(
  $$ insert into public.storage_settings (id) values (false) $$,
  '23514',
  'new row for relation "storage_settings" violates check constraint "storage_settings_id_check"',
  '저장 설정은 false ID를 거부한다'
);

select is(
  (select quota_bytes from public.storage_settings where id),
  1073741824::bigint,
  '저장 설정의 초기 무료 한도는 1GiB다'
);

select is(
  (select warning_state from public.storage_settings where id),
  'armed'::text,
  '저장 설정의 초기 경고 상태는 armed다'
);

select lives_ok(
  $$ delete from public.courses where id = '10000000-0000-0000-0000-000000000001' $$,
  '강의를 삭제하면 연결된 회차는 cascade된다'
);

select is(
  (select count(*) from public.lessons where id = '20000000-0000-0000-0000-000000000001'),
  0::bigint,
  '강의 삭제 뒤 회차가 제거된다'
);

select is(
  (select count(*) from public.attachments where storage_path = 'attachments/lesson.pdf'),
  0::bigint,
  '회차 삭제 뒤 회차 첨부가 함께 제거된다'
);

select is(
  (select course_id from public.posts where id = '30000000-0000-0000-0000-000000000001'),
  null::uuid,
  '강의 삭제 뒤 게시글 강의 태그는 null로 남는다'
);

select throws_ok(
  $$ delete from public.profiles where id = '00000000-0000-0000-0000-000000000001' $$,
  '23503',
  'update or delete on table "profiles" violates foreign key constraint "posts_author_id_fkey" on table "posts"',
  '게시글 작성자를 삭제하는 것은 restrict된다'
);

select * from finish();

rollback;
