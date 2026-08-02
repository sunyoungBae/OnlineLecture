revoke all on all tables in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.courses, public.lessons, public.posts, public.comments, public.attachments to anon;
grant select, insert, update, delete on public.profiles, public.courses, public.lessons, public.posts, public.comments, public.attachments to authenticated;
grant select on public.storage_settings to authenticated;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.attachments enable row level security;
alter table public.storage_settings enable row level security;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create policy "공개 별명 읽기"
on public.profiles
for select
to anon, authenticated
using (true);

create policy "회원 자신의 프로필 만들기"
on public.profiles
for insert
to authenticated
with check (id = (select auth.uid()) and role = 'member');

create policy "회원 자신의 프로필 수정"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()) and role = 'member')
with check (id = (select auth.uid()) and role = 'member');

create policy "공개 강의와 운영자 비공개 강의 읽기"
on public.courses
for select
to anon, authenticated
using (is_published or (select public.is_admin()));

create policy "운영자 강의 관리"
on public.courses
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "공개 강의 회차와 운영자 비공개 회차 읽기"
on public.lessons
for select
to anon, authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.courses
    where courses.id = lessons.course_id
      and courses.is_published
  )
);

create policy "운영자 회차 관리"
on public.lessons
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "공개 게시글 읽기"
on public.posts
for select
to anon, authenticated
using (true);

create policy "회원 작성과 운영자 게시글 만들기"
on public.posts
for insert
to authenticated
with check (
  (select public.is_admin())
  or (
    author_id = (select auth.uid())
    and not is_notice
  )
);

create policy "작성자와 운영자 게시글 수정"
on public.posts
for update
to authenticated
using (author_id = (select auth.uid()) or (select public.is_admin()))
with check (
  (select public.is_admin())
  or (
    author_id = (select auth.uid())
    and not is_notice
  )
);

create policy "작성자와 운영자 게시글 삭제"
on public.posts
for delete
to authenticated
using (author_id = (select auth.uid()) or (select public.is_admin()));

create policy "공개 댓글 읽기"
on public.comments
for select
to anon, authenticated
using (true);

create policy "회원 자신의 댓글과 운영자 댓글 만들기"
on public.comments
for insert
to authenticated
with check (author_id = (select auth.uid()) or (select public.is_admin()));

create policy "작성자 자신의 댓글 수정"
on public.comments
for update
to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

create policy "작성자와 운영자 댓글 삭제"
on public.comments
for delete
to authenticated
using (author_id = (select auth.uid()) or (select public.is_admin()));

create policy "공개 대상과 운영자 첨부 메타데이터 읽기"
on public.attachments
for select
to anon, authenticated
using (
  (select public.is_admin())
  or post_id is not null
  or exists (
    select 1
    from public.lessons
    join public.courses on courses.id = lessons.course_id
    where lessons.id = attachments.lesson_id
      and courses.is_published
  )
);

create policy "게시글 작성자·운영자 첨부 생성"
on public.attachments
for insert
to authenticated
with check (
  (select public.is_admin())
  or exists (
    select 1
    from public.posts
    where posts.id = attachments.post_id
      and posts.author_id = (select auth.uid())
  )
);

create policy "게시글 작성자·운영자 첨부 수정"
on public.attachments
for update
to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.posts
    where posts.id = attachments.post_id
      and posts.author_id = (select auth.uid())
  )
)
with check (
  (select public.is_admin())
  or exists (
    select 1
    from public.posts
    where posts.id = attachments.post_id
      and posts.author_id = (select auth.uid())
  )
);

create policy "게시글 작성자·운영자 첨부 삭제"
on public.attachments
for delete
to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.posts
    where posts.id = attachments.post_id
      and posts.author_id = (select auth.uid())
  )
);

create policy "운영자 저장 설정 읽기"
on public.storage_settings
for select
to authenticated
using ((select public.is_admin()));
