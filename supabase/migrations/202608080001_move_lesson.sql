alter table public.lessons
  drop constraint lessons_course_position_key,
  add constraint lessons_course_position_key unique (course_id, position) deferrable initially immediate;

create function public.move_lesson(p_lesson_id uuid, p_direction text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course_id uuid;
  v_current_position integer;
  v_target_id uuid;
  v_target_position integer;
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception '관리자만 회차 순서를 변경할 수 있습니다' using errcode = '42501';
  end if;

  if p_direction not in ('up', 'down') then
    raise exception '회차 이동 방향이 올바르지 않습니다' using errcode = '22023';
  end if;

  select course_id into v_course_id
  from public.lessons
  where id = p_lesson_id;

  if not found then
    return false;
  end if;

  perform 1
  from public.lessons
  where course_id = v_course_id
  order by position, id
  for update;

  select position into v_current_position
  from public.lessons
  where id = p_lesson_id;

  if not found then
    return false;
  end if;

  select id, position into v_target_id, v_target_position
  from public.lessons
  where course_id = v_course_id
    and (case when p_direction = 'up' then position < v_current_position else position > v_current_position end)
  order by case when p_direction = 'up' then position end desc, case when p_direction = 'down' then position end asc
  limit 1;

  if not found then
    return false;
  end if;

  set constraints public.lessons_course_position_key deferred;
  update public.lessons
  set position = case
    when id = p_lesson_id then v_target_position
    when id = v_target_id then v_current_position
    else position
  end
  where id in (p_lesson_id, v_target_id);

  return true;
end;
$$;

revoke all on function public.move_lesson(uuid, text) from public;
grant execute on function public.move_lesson(uuid, text) to authenticated;
