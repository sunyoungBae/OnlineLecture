begin;

select plan(24);

select is(
  (select public from storage.buckets where id = 'attachments'),
  false,
  'attachments 버킷은 비공개다'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'storage.objects'::regclass),
  'storage.objects는 RLS가 활성화되어 있다'
);

-- Storage API가 객체 메타데이터를 삭제할 때 사용하는 보호 트리거 계약을 재현한다.
select set_config('storage.allow_delete_query', 'true', true);

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claim.sub', '', true);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('attachments', 'posts/server.pdf') $$,
  '서버 역할은 검증용 객체를 만들 수 있다'
);

set local role postgres;

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and roles && array['public'::name]
  ),
  0::bigint,
  'public 역할에 객체 CRUD 정책이 없다'
);
select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and roles && array['anon'::name]
  ),
  0::bigint,
  '비회원 역할에 객체 CRUD 정책이 없다'
);
select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and roles && array['authenticated'::name]
  ),
  0::bigint,
  '회원 역할에 객체 CRUD 정책이 없다'
);

set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);

select is_empty(
  $$ select id from storage.buckets where id = 'attachments' $$,
  '비회원은 비공개 버킷 메타데이터를 읽을 수 없다'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values ('attachments', 'posts/anon.pdf', null) $$,
  '42501', null, '비회원은 객체를 만들 수 없다'
);
select is_empty(
  $$ select id from storage.objects where bucket_id = 'attachments' and name = 'posts/server.pdf' $$,
  '비회원은 존재하는 객체를 읽을 수 없다'
);
select is_empty(
  $$ update storage.objects set name = 'posts/anon-renamed.pdf' where bucket_id = 'attachments' and name = 'posts/server.pdf' returning id $$,
  '비회원은 존재하는 객체를 수정할 수 없다'
);
select is_empty(
  $$ delete from storage.objects where bucket_id = 'attachments' and name = 'posts/server.pdf' returning id $$,
  '비회원은 존재하는 객체를 삭제할 수 없다'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select is_empty(
  $$ select id from storage.buckets where id = 'attachments' $$,
  '회원은 비공개 버킷 메타데이터를 직접 읽을 수 없다'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values ('attachments', 'posts/member.pdf', auth.uid()::text) $$,
  '42501', null, '회원은 브라우저에서 객체를 직접 만들 수 없다'
);
select is_empty(
  $$ select id from storage.objects where bucket_id = 'attachments' and name = 'posts/server.pdf' $$,
  '회원은 존재하는 객체를 직접 읽을 수 없다'
);
select is_empty(
  $$ update storage.objects set name = 'posts/member-renamed.pdf' where bucket_id = 'attachments' and name = 'posts/server.pdf' returning id $$,
  '회원은 존재하는 객체를 직접 수정할 수 없다'
);
select is_empty(
  $$ delete from storage.objects where bucket_id = 'attachments' and name = 'posts/server.pdf' returning id $$,
  '회원은 존재하는 객체를 직접 삭제할 수 없다'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values ('attachments', 'posts/admin.pdf', auth.uid()::text) $$,
  '42501', null, '운영자 JWT도 브라우저에서 객체를 직접 만들 수 없다'
);
select is_empty(
  $$ select id from storage.objects where bucket_id = 'attachments' and name = 'posts/server.pdf' $$,
  '운영자 JWT도 존재하는 객체를 직접 읽을 수 없다'
);
select is_empty(
  $$ update storage.objects set name = 'posts/admin-renamed.pdf' where bucket_id = 'attachments' and name = 'posts/server.pdf' returning id $$,
  '운영자 JWT도 존재하는 객체를 직접 수정할 수 없다'
);
select is_empty(
  $$ delete from storage.objects where bucket_id = 'attachments' and name = 'posts/server.pdf' returning id $$,
  '운영자 JWT도 존재하는 객체를 직접 삭제할 수 없다'
);

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claim.sub', '', true);

select results_eq(
  $$ select name from storage.objects where bucket_id = 'attachments' and name = 'posts/server.pdf' $$,
  $$ values ('posts/server.pdf'::text) $$,
  '서버 역할은 서명 URL 발급을 위해 객체를 읽을 수 있다'
);
select lives_ok(
  $$ update storage.objects set name = 'posts/server-renamed.pdf' where bucket_id = 'attachments' and name = 'posts/server.pdf' $$,
  '서버 역할은 보상 처리 중 객체를 수정할 수 있다'
);
select lives_ok(
  $$ delete from storage.objects where bucket_id = 'attachments' and name = 'posts/server-renamed.pdf' $$,
  '서버 역할은 Storage API 경계에서 객체를 삭제할 수 있다'
);
select is_empty(
  $$ select id from storage.objects where bucket_id = 'attachments' and name = 'posts/server-renamed.pdf' $$,
  '서버 역할이 삭제한 객체 메타데이터는 남지 않는다'
);

select * from finish();

rollback;
