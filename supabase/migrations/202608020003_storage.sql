insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false);

-- 객체 작업은 service role을 사용하는 서버 경로로만 수행한다.
-- anon/authenticated 정책을 만들지 않아 브라우저의 직접 CRUD를 차단한다.
