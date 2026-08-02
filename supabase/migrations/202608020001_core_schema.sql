create extension if not exists pg_trgm with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index profiles_nickname_lower_key on public.profiles (lower(nickname));

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  is_published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  position integer not null check (position > 0),
  title text not null,
  description text not null default '',
  youtube_video_id text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint lessons_course_position_key unique (course_id, position)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete restrict,
  course_id uuid references public.courses (id) on delete set null,
  title text not null,
  content jsonb not null,
  search_text text not null,
  is_notice boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index posts_title_trgm_idx on public.posts using gin (title extensions.gin_trgm_ops);
create index posts_search_text_trgm_idx on public.posts using gin (search_text extensions.gin_trgm_ops);
create index posts_notice_created_at_idx on public.posts (is_notice desc, created_at desc);
create index posts_course_id_created_at_idx on public.posts (course_id, created_at desc);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete restrict,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index comments_post_id_created_at_idx on public.comments (post_id, created_at);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default timezone('utc', now()),
  constraint attachments_exactly_one_target_check check (num_nonnulls(post_id, lesson_id) = 1)
);

create index attachments_post_id_idx on public.attachments (post_id) where post_id is not null;
create index attachments_lesson_id_idx on public.attachments (lesson_id) where lesson_id is not null;

create table public.storage_settings (
  id boolean primary key default true check (id),
  quota_bytes bigint not null default 1073741824 check (quota_bytes > 0),
  warning_state text not null default 'armed' check (warning_state in ('armed', 'sent')),
  last_warning_email_sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.storage_settings (id) values (true);
