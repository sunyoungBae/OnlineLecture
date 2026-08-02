begin;

select plan(16);

select is(
  (select public from storage.buckets where id = 'attachments'),
  false,
  'attachments 버킷은 비공개다'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'storage.objects'::regclass),
  'storage.objects는 RLS가 활성화되어 있다'
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
  $$ select id from storage.objects where bucket_id = 'attachments' $$,
  '비회원은 객체 목록을 읽을 수 없다'
);
select is_empty(
  $$ update storage.objects set name = 'posts/anon-renamed.pdf' where bucket_id = 'attachments' returning id $$,
  '비회원은 객체를 수정할 수 없다'
);
select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd in ('ALL', 'DELETE')
      and roles && array['anon'::name]
  ),
  '비회원에게 객체 삭제 정책이 없다'
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
  $$ select id from storage.objects where bucket_id = 'attachments' $$,
  '회원은 객체 목록을 직접 읽을 수 없다'
);
select is_empty(
  $$ update storage.objects set name = 'posts/member-renamed.pdf' where bucket_id = 'attachments' returning id $$,
  '회원은 객체를 직접 수정할 수 없다'
);
select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd in ('ALL', 'DELETE')
      and roles && array['authenticated'::name]
  ),
  '회원에게 객체 삭제 정책이 없다'
);

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claim.sub', '', true);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('attachments', 'posts/server.pdf') $$,
  '서버 역할은 권한 확인 뒤 객체를 만들 수 있다'
);
select results_eq(
  $$ select name from storage.objects where bucket_id = 'attachments' and name = 'posts/server.pdf' $$,
  $$ values ('posts/server.pdf'::text) $$,
  '서버 역할은 서명 URL 발급을 위해 객체를 읽을 수 있다'
);
select lives_ok(
  $$ update storage.objects set name = 'posts/server-renamed.pdf' where bucket_id = 'attachments' and name = 'posts/server.pdf' $$,
  '서버 역할은 보상 처리 중 객체를 수정할 수 있다'
);
select ok(
  (select rolbypassrls from pg_roles where rolname = 'service_role'),
  '서버 역할은 Storage API에서 객체를 삭제할 수 있도록 RLS를 우회한다'
);

select * from finish();

rollback;
