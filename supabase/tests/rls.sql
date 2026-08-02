begin;

select plan(81);

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
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-author@example.com', 'not-used', '{}', '{}'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-member@example.com', 'not-used', '{}', '{}'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-admin@example.com', 'not-used', '{}', '{}'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-joiner@example.com', 'not-used', '{}', '{}'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-escalation@example.com', 'not-used', '{}', '{}');

insert into public.profiles (id, nickname, role)
values
  ('10000000-0000-0000-0000-000000000001', '작성자', 'member'),
  ('10000000-0000-0000-0000-000000000002', '회원', 'member'),
  ('10000000-0000-0000-0000-000000000003', '운영자', 'admin');

insert into public.courses (id, title, slug, description, is_published)
values
  ('20000000-0000-0000-0000-000000000001', '공개 강의', 'public-course', '공개 설명', true),
  ('20000000-0000-0000-0000-000000000002', '비공개 강의', 'private-course', '비공개 설명', false);

insert into public.lessons (id, course_id, position, title, description, youtube_video_id)
values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1, '공개 회차', '공개 설명', 'public-video'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 1, '비공개 회차', '비공개 설명', 'private-video');

insert into public.posts (id, author_id, course_id, title, content, search_text)
values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '작성자 게시글', '{"type":"doc","content":[]}', '작성자 게시글'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', null, '회원 게시글', '{"type":"doc","content":[]}', '회원 게시글');

insert into public.comments (id, post_id, author_id, body)
values
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '작성자 댓글'),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '회원 댓글');

insert into public.attachments (id, post_id, storage_path, original_filename, mime_type, size_bytes)
values
  ('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'posts/author.pdf', 'author.pdf', 'application/pdf', 1);

insert into public.attachments (id, lesson_id, storage_path, original_filename, mime_type, size_bytes)
values
  ('60000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'lessons/public.pdf', 'public.pdf', 'application/pdf', 1),
  ('60000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'lessons/private.pdf', 'private.pdf', 'application/pdf', 1);

set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);

select ok(
  coalesce((select relkind = 'v' from pg_class where oid = to_regclass('public.public_profiles')), false),
  '공개 별명 전용 public_profiles 뷰가 있다'
);
select is(
  (select count(*) from pg_attribute where attrelid = to_regclass('public.public_profiles') and attnum > 0 and not attisdropped),
  2::bigint,
  '공개 별명 뷰는 id와 nickname 두 열만 노출한다'
);
select ok(
  coalesce((select reloptions @> array['security_barrier=true'] from pg_class where oid = to_regclass('public.public_profiles')), false),
  '공개 별명 뷰는 security_barrier를 고정한다'
);
select ok(
  coalesce((select reloptions @> array['security_invoker=false'] from pg_class where oid = to_regclass('public.public_profiles')), false),
  '공개 별명 뷰는 안전한 소유자 권한으로 원본 RLS를 우회한다'
);
select ok(
  coalesce((select has_table_privilege('anon', oid, 'select') from pg_class where oid = to_regclass('public.public_profiles')), false),
  '비회원은 공개 별명 뷰를 읽을 수 있다'
);
select throws_ok(
  $$ select * from public.profiles $$,
  '42501', null, '비회원은 원본 프로필을 읽을 수 없다'
);
select lives_ok(
  $$ select id, nickname from public.public_profiles $$,
  '비회원은 공개 별명 뷰를 읽을 수 있다'
);
select throws_ok(
  $$ select role from public.public_profiles $$,
  '42703', null, '공개 별명 뷰는 role을 노출하지 않는다'
);
select results_eq(
  $$ select nickname from public.public_profiles where id = '10000000-0000-0000-0000-000000000001' $$,
  $$ values ('작성자'::text) $$,
  '비회원은 공개 별명을 읽을 수 있다'
);
select results_eq(
  $$ select id from public.courses where id = '20000000-0000-0000-0000-000000000001' $$,
  $$ values ('20000000-0000-0000-0000-000000000001'::uuid) $$,
  '비회원은 공개 강의를 읽을 수 있다'
);
select is_empty(
  $$ select id from public.courses where id = '20000000-0000-0000-0000-000000000002' $$,
  '비회원은 비공개 강의를 읽을 수 없다'
);
select is_empty(
  $$ select id from public.lessons where id = '30000000-0000-0000-0000-000000000001' $$,
  '비회원은 공개 강의 회차도 읽을 수 없다'
);
select results_eq(
  $$ select id from public.posts where id = '40000000-0000-0000-0000-000000000001' $$,
  $$ values ('40000000-0000-0000-0000-000000000001'::uuid) $$,
  '비회원은 게시글을 읽을 수 있다'
);
select results_eq(
  $$ select id from public.comments where id = '50000000-0000-0000-0000-000000000001' $$,
  $$ values ('50000000-0000-0000-0000-000000000001'::uuid) $$,
  '비회원은 댓글을 읽을 수 있다'
);
select is_empty(
  $$ select id from public.attachments where id = '60000000-0000-0000-0000-000000000002' $$,
  '비회원은 공개 회차 첨부 메타데이터도 읽을 수 없다'
);
select throws_ok(
  $$ select * from public.storage_settings $$,
  '42501', null, '비회원은 저장 설정을 읽을 수 없다'
);
select throws_ok(
  $$ insert into public.posts (author_id, title, content, search_text) values ('10000000-0000-0000-0000-000000000001', '비회원 글', '{"type":"doc","content":[]}', '비회원 글') $$,
  '42501', null, '비회원은 게시글을 작성할 수 없다'
);
select throws_ok(
  $$ insert into public.comments (post_id, author_id, body) values ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '비회원 댓글') $$,
  '42501', null, '비회원은 댓글을 작성할 수 없다'
);

set local role postgres;
select is(
  to_regprocedure('public.is_admin()'),
  null::regprocedure,
  '공개 스키마에 SECURITY DEFINER 관리자 헬퍼가 없다'
);
select is(
  (select prosecdef from pg_proc where oid = to_regprocedure('private.is_admin()')),
  true,
  '비공개 관리자 헬퍼는 SECURITY DEFINER다'
);
select ok(
  coalesce((select proconfig @> array['search_path=""'] from pg_proc where oid = to_regprocedure('private.is_admin()')), false),
  '비공개 관리자 헬퍼는 빈 search_path를 고정한다'
);
select ok(
  not coalesce((select has_function_privilege('anon', oid, 'execute') from pg_proc where oid = to_regprocedure('private.is_admin()')), false),
  '비회원은 비공개 관리자 헬퍼를 실행할 수 없다'
);
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);

select lives_ok(
  $$ insert into public.profiles (id, nickname) values ('10000000-0000-0000-0000-000000000004', '새회원') $$,
  '회원은 자신의 프로필을 만들 수 있다'
);
select throws_ok(
  $$ insert into public.profiles (id, nickname) values ('10000000-0000-0000-0000-000000000005', '가짜회원') $$,
  '42501', null, '회원은 다른 사람의 프로필을 만들 수 없다'
);
select lives_ok(
  $$ update public.profiles set nickname = '새별명' where id = '10000000-0000-0000-0000-000000000004' $$,
  '회원은 자신의 프로필을 수정할 수 있다'
);
select results_eq(
  $$ select role from public.profiles where id = '10000000-0000-0000-0000-000000000004' $$,
  $$ values ('member'::text) $$,
  '회원은 자신의 원본 프로필 역할을 읽을 수 있다'
);
select is_empty(
  $$ select id from public.profiles where id = '10000000-0000-0000-0000-000000000001' $$,
  '회원은 다른 사람의 원본 프로필을 읽을 수 없다'
);
select throws_ok(
  $$ insert into public.profiles (id, nickname, role) values ('10000000-0000-0000-0000-000000000005', '관리자위조', 'admin') $$,
  '42501', null, '회원은 자신의 프로필도 admin 역할로 만들 수 없다'
);
select throws_ok(
  $$ update public.profiles set role = 'admin' where id = '10000000-0000-0000-0000-000000000004' $$,
  '42501', null,
  '회원은 자신의 역할을 admin으로 바꿀 수 없다'
);
select results_eq(
  $$
    with denied as (
      update public.profiles
      set nickname = '탈취시도'
      where id = '10000000-0000-0000-0000-000000000001'
      returning *
    )
    select count(*) from denied
  $$,
  $$ values (0::bigint) $$,
  '회원은 다른 사람의 프로필을 수정할 수 없다'
);
select is_empty(
  $$ select id from public.courses where id = '20000000-0000-0000-0000-000000000002' $$,
  '회원은 비공개 강의를 읽을 수 없다'
);
select is_empty(
  $$ select id from public.lessons where id = '30000000-0000-0000-0000-000000000002' $$,
  '회원은 비공개 강의 회차를 읽을 수 없다'
);
select is_empty(
  $$ select id from public.attachments where id = '60000000-0000-0000-0000-000000000003' $$,
  '회원은 비공개 강의 회차 첨부 메타데이터를 읽을 수 없다'
);
select results_eq(
  $$ select id from public.lessons where id = '30000000-0000-0000-0000-000000000001' $$,
  $$ values ('30000000-0000-0000-0000-000000000001'::uuid) $$,
  '회원은 공개 강의 회차를 읽을 수 있다'
);
select results_eq(
  $$ select id from public.attachments where id = '60000000-0000-0000-0000-000000000002' $$,
  $$ values ('60000000-0000-0000-0000-000000000002'::uuid) $$,
  '회원은 공개 회차 첨부 메타데이터를 읽을 수 있다'
);
select throws_ok(
  $$ insert into public.courses (title, slug) values ('회원 강의', 'member-course') $$,
  '42501', null, '회원은 강의를 만들 수 없다'
);
select lives_ok(
  $$ insert into public.posts (id, author_id, title, content, search_text) values ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', '내 글', '{"type":"doc","content":[]}', '내 글') $$,
  '회원은 자신의 게시글을 작성할 수 있다'
);
select throws_ok(
  $$ insert into public.posts (author_id, title, content, search_text) values ('10000000-0000-0000-0000-000000000001', '위조 글', '{"type":"doc","content":[]}', '위조 글') $$,
  '42501', null, '회원은 다른 사람 명의 게시글을 작성할 수 없다'
);
select lives_ok(
  $$ update public.posts set title = '수정한 내 글' where author_id = '10000000-0000-0000-0000-000000000004' $$,
  '회원은 자신의 게시글을 수정할 수 있다'
);
set local role postgres;
insert into public.posts (id, author_id, title, content, search_text, is_notice)
values ('40000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000004', '관리자 고정 글', '{"type":"doc","content":[]}', '관리자 고정 글', true);
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select results_eq(
  $$ with denied as (update public.posts set title = '공지 수정 시도' where id = '40000000-0000-0000-0000-000000000006' returning *) select count(*) from denied $$,
  $$ values (0::bigint) $$,
  '회원은 관리자가 공지로 만든 자기 글을 수정할 수 없다'
);
select results_eq(
  $$ with denied as (update public.posts set is_notice = false where id = '40000000-0000-0000-0000-000000000006' returning *) select count(*) from denied $$,
  $$ values (0::bigint) $$,
  '회원은 관리자가 공지로 만든 자기 글의 공지를 해제할 수 없다'
);
select throws_ok(
  $$ update public.posts set is_notice = true where id = '40000000-0000-0000-0000-000000000003' $$,
  '42501', null,
  '회원은 자신의 게시글도 공지로 바꿀 수 없다'
);
select results_eq(
  $$
    with denied as (
      update public.posts
      set title = '탈취 시도'
      where id = '40000000-0000-0000-0000-000000000001'
      returning *
    )
    select count(*) from denied
  $$,
  $$ values (0::bigint) $$,
  '회원은 다른 사람 게시글을 수정할 수 없다'
);
select throws_ok(
  $$ insert into public.posts (author_id, title, content, search_text, is_notice) values ('10000000-0000-0000-0000-000000000004', '거짓 공지', '{"type":"doc","content":[]}', '거짓 공지', true) $$,
  '42501', null, '회원은 공지를 작성할 수 없다'
);
select lives_ok(
  $$ insert into public.comments (id, post_id, author_id, body) values ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', '내 댓글') $$,
  '회원은 자신의 댓글을 작성할 수 있다'
);
select throws_ok(
  $$ insert into public.comments (post_id, author_id, body) values ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '위조 댓글') $$,
  '42501', null, '회원은 다른 사람 명의 댓글을 작성할 수 없다'
);
select lives_ok(
  $$ update public.comments set body = '수정한 내 댓글' where author_id = '10000000-0000-0000-0000-000000000004' $$,
  '회원은 자신의 댓글을 수정할 수 있다'
);
select lives_ok(
  $$ delete from public.comments where id = '50000000-0000-0000-0000-000000000003' $$,
  '회원은 자신의 댓글을 삭제할 수 있다'
);
select results_eq(
  $$
    with denied as (
      delete from public.comments
      where id = '50000000-0000-0000-0000-000000000001'
      returning *
    )
    select count(*) from denied
  $$,
  $$ values (0::bigint) $$,
  '회원은 다른 사람 댓글을 삭제할 수 없다'
);
select lives_ok(
  $$ insert into public.attachments (id, post_id, storage_path, original_filename, mime_type, size_bytes) values ('60000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000003', 'posts/member.pdf', 'member.pdf', 'application/pdf', 1) $$,
  '회원은 자신의 게시글 첨부 메타데이터를 만들 수 있다'
);
select throws_ok(
  $$ update public.attachments set post_id = '40000000-0000-0000-0000-000000000001' where id = '60000000-0000-0000-0000-000000000004' $$,
  '42501', null,
  '회원은 자신의 첨부를 다른 사람 게시글로 옮길 수 없다'
);
select throws_ok(
  $$ update public.attachments set storage_path = 'posts/member-renamed.pdf' where id = '60000000-0000-0000-0000-000000000004' $$,
  '42501', null, '회원은 자신의 첨부 경로도 수정할 수 없다'
);
select lives_ok(
  $$ delete from public.attachments where id = '60000000-0000-0000-0000-000000000004' $$,
  '회원은 자신의 게시글 첨부 메타데이터를 삭제할 수 있다'
);
select lives_ok(
  $$ delete from public.posts where id = '40000000-0000-0000-0000-000000000003' $$,
  '회원은 자신의 게시글을 삭제할 수 있다'
);
select throws_ok(
  $$ insert into public.attachments (post_id, storage_path, original_filename, mime_type, size_bytes) values ('40000000-0000-0000-0000-000000000001', 'posts/stolen.pdf', 'stolen.pdf', 'application/pdf', 1) $$,
  '42501', null, '회원은 다른 사람 게시글 첨부를 만들 수 없다'
);
select throws_ok(
  $$ insert into public.attachments (lesson_id, storage_path, original_filename, mime_type, size_bytes) values ('30000000-0000-0000-0000-000000000001', 'lessons/member.pdf', 'member.pdf', 'application/pdf', 1) $$,
  '42501', null, '회원은 회차 첨부를 만들 수 없다'
);
select is_empty(
  $$ select * from public.storage_settings $$,
  '회원은 저장 설정을 읽을 수 없다'
);

set local role postgres;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);

select results_eq(
  $$ select id from public.courses where id = '20000000-0000-0000-0000-000000000002' $$,
  $$ values ('20000000-0000-0000-0000-000000000002'::uuid) $$,
  '운영자는 비공개 강의를 읽을 수 있다'
);
select results_eq(
  $$ select id from public.lessons where id = '30000000-0000-0000-0000-000000000002' $$,
  $$ values ('30000000-0000-0000-0000-000000000002'::uuid) $$,
  '운영자는 비공개 강의 회차를 읽을 수 있다'
);
select results_eq(
  $$ select role from public.profiles where id = '10000000-0000-0000-0000-000000000001' $$,
  $$ values ('member'::text) $$,
  '운영자는 모든 원본 프로필 역할을 읽을 수 있다'
);
select lives_ok(
  $$ insert into public.courses (id, title, slug) values ('20000000-0000-0000-0000-000000000003', '운영자 강의', 'admin-course') $$,
  '운영자는 강의를 만들 수 있다'
);
select lives_ok(
  $$ insert into public.lessons (id, course_id, position, title, youtube_video_id) values ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 1, '운영자 회차', 'admin-video') $$,
  '운영자는 회차를 만들 수 있다'
);
select lives_ok(
  $$ update public.courses set title = '수정 운영자 강의' where id = '20000000-0000-0000-0000-000000000003' $$,
  '운영자는 강의를 수정할 수 있다'
);
select lives_ok(
  $$ update public.lessons set title = '수정 운영자 회차' where id = '30000000-0000-0000-0000-000000000003' $$,
  '운영자는 회차를 수정할 수 있다'
);
select lives_ok(
  $$ delete from public.courses where id = '20000000-0000-0000-0000-000000000003' $$,
  '운영자는 강의를 삭제할 수 있다'
);
select is_empty(
  $$ select id from public.lessons where id = '30000000-0000-0000-0000-000000000003' $$,
  '운영자가 강의를 삭제하면 회차도 제거된다'
);
select lives_ok(
  $$ insert into public.posts (author_id, title, content, search_text, is_notice) values ('10000000-0000-0000-0000-000000000003', '운영자 공지', '{"type":"doc","content":[]}', '운영자 공지', true) $$,
  '운영자는 공지를 작성할 수 있다'
);
select throws_ok(
  $$ insert into public.posts (author_id, title, content, search_text) values ('10000000-0000-0000-0000-000000000001', '운영자 위조 글', '{"type":"doc","content":[]}', '운영자 위조 글') $$,
  '42501', null, '운영자도 다른 사람 명의 게시글을 작성할 수 없다'
);
select throws_ok(
  $$ insert into public.comments (post_id, author_id, body) values ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '운영자 위조 댓글') $$,
  '42501', null, '운영자도 다른 사람 명의 댓글을 작성할 수 없다'
);
select lives_ok(
  $$ insert into public.comments (post_id, author_id, body) values ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', '운영자 댓글') $$,
  '운영자는 자신의 명의 댓글을 작성할 수 있다'
);
select lives_ok(
  $$ update public.posts set title = '운영자 수정' where id = '40000000-0000-0000-0000-000000000001' $$,
  '운영자는 다른 사람 게시글을 수정할 수 있다'
);
select throws_ok(
  $$ update public.posts set author_id = '10000000-0000-0000-0000-000000000002' where id = '40000000-0000-0000-0000-000000000001' $$,
  '42501', null, '운영자는 다른 사람 게시글의 작성자를 바꿀 수 없다'
);
select lives_ok(
  $$ delete from public.posts where id = '40000000-0000-0000-0000-000000000002' $$,
  '운영자는 다른 사람 게시글을 삭제할 수 있다'
);
select results_eq(
  $$
    with denied as (
      update public.comments
      set body = '운영자 수정 시도'
      where id = '50000000-0000-0000-0000-000000000002'
      returning *
    )
    select count(*) from denied
  $$,
  $$ values (0::bigint) $$,
  '운영자는 다른 사람 댓글을 수정할 수 없다'
);
select lives_ok(
  $$ delete from public.comments where id = '50000000-0000-0000-0000-000000000001' $$,
  '운영자는 다른 사람 댓글을 삭제할 수 있다'
);
select results_eq(
  $$ select id from public.attachments where id = '60000000-0000-0000-0000-000000000003' $$,
  $$ values ('60000000-0000-0000-0000-000000000003'::uuid) $$,
  '운영자는 비공개 회차 첨부 메타데이터를 읽을 수 있다'
);
select lives_ok(
  $$ insert into public.attachments (lesson_id, storage_path, original_filename, mime_type, size_bytes) values ('30000000-0000-0000-0000-000000000002', 'lessons/admin.pdf', 'admin.pdf', 'application/pdf', 1) $$,
  '운영자는 회차 첨부 메타데이터를 만들 수 있다'
);
select throws_ok(
  $$ update public.attachments set storage_path = 'lessons/admin-renamed.pdf' where id = '60000000-0000-0000-0000-000000000003' $$,
  '42501', null, '운영자도 첨부 메타데이터를 수정할 수 없다'
);
select lives_ok(
  $$ delete from public.attachments where id = '60000000-0000-0000-0000-000000000003' $$,
  '운영자는 회차 첨부 메타데이터를 삭제할 수 있다'
);
select throws_ok(
  $$ update public.storage_settings set warning_state = 'sent' where id $$,
  '42501', null, '운영자는 저장 설정을 수정할 수 없다'
);
select results_eq(
  $$ select warning_state from public.storage_settings where id $$,
  $$ values ('armed'::text) $$,
  '운영자는 저장 설정을 읽을 수 있다'
);

select * from finish();

rollback;
