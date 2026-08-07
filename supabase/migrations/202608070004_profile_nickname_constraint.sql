alter table public.profiles
  add constraint profiles_nickname_format_check
  check (nickname ~ '^[가-힣A-Za-z0-9_]{2,20}$');
