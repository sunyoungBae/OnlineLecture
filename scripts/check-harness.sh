#!/bin/sh
set -eu

root=${HARNESS_ROOT:-.}
cards_dir="$root/docs/tasks"
dashboard="$cards_dir/README.md"

fail() {
  echo "하네스 검사 실패: $*" >&2
  exit 1
}

[ -d "$cards_dir" ] || fail "작업 카드 디렉터리 없음"
[ -f "$dashboard" ] || fail "대시보드 없음"

tmp_dir=$(mktemp -d "${TMPDIR:-/tmp}/online-lecture-check.XXXXXX")
trap 'rm -rf "$tmp_dir"' 0 HUP INT TERM
cards="$tmp_dir/cards.txt"
meta="$tmp_dir/meta.tsv"

find "$cards_dir" -type f | grep '/phase-[0-9][0-9]/.*\.md$' | sort > "$cards" || true
[ -s "$cards" ] || fail "작업 카드 없음"

expected_keys='id title status type depends_on parallel_group owner started_at blocked_reason owned_files shared_files implementation_commit reviewer review_commit'

value_of() {
  key=$1
  file=$2
  sed -n "s/^$key: *//p" "$file" | sed -n '1p'
}

while IFS= read -r file; do
  keys=$(awk '
    NR == 1 && $0 != "---" { exit 2 }
    NR > 1 && $0 == "---" { exit }
    NR > 1 { line=$0; sub(/:.*/, "", line); printf "%s%s", sep, line; sep=" " }
  ' "$file") || fail "front matter 시작 오류: $file"
  [ "$keys" = "$expected_keys" ] || fail "front matter 키 또는 순서 오류: $file"

  id=$(value_of id "$file")
  status=$(value_of status "$file")
  type=$(value_of type "$file")
  depends=$(value_of depends_on "$file")
  group=$(value_of parallel_group "$file" | sed 's/^"//; s/"$//')
  blocked=$(value_of blocked_reason "$file" | sed 's/^"//; s/"$//')
  owned=$(value_of owned_files "$file")

  printf '%s|%s|%s|%s|%s|%s|%s|%s\n' \
    "$id" "$status" "$type" "$depends" "$group" "$blocked" "$owned" "$file" >> "$meta"
done < "$cards"

duplicate=$(cut -d '|' -f1 "$meta" | sort | uniq -d | sed -n '1p')
[ -z "$duplicate" ] || fail "중복 작업 ID: $duplicate"

while IFS='|' read -r id status type depends group blocked owned file; do
  printf '%s\n' "$id" | grep -Eq '^P[0-9]{2}-T[0-9]{2}$' || fail "작업 ID 형식 오류: $file"
  case "$status" in
    blocked|ready|in_progress|review|done) ;;
    *) fail "허용되지 않은 상태: $id ($status)" ;;
  esac
  case "$type" in
    feature|migration|config|docs|manual-checkpoint) ;;
    *) fail "허용되지 않은 작업 유형: $id ($type)" ;;
  esac
  if [ "$status" = blocked ]; then
    case "$blocked" in dependency|external|decision) ;; *) fail "blocked_reason 필요: $id" ;; esac
  elif [ -n "$blocked" ]; then
    fail "blocked_reason은 빈 값이어야 함: $id"
  fi
done < "$meta"

while IFS='|' read -r id status type depends group blocked owned file; do
  deps=$(printf '%s' "$depends" | sed 's/^\[//; s/\]$//; s/"//g; s/,/ /g')
  unmet=0
  for dep in $deps; do
    awk -F '|' -v wanted="$dep" '$1 == wanted { found=1 } END { exit !found }' "$meta" \
      || fail "알 수 없는 의존 작업: $id -> $dep"
    dep_status=$(awk -F '|' -v wanted="$dep" '$1 == wanted { print $2; exit }' "$meta")
    if [ "$dep_status" != done ]; then
      unmet=1
      [ "$status" = blocked ] || fail "미완료 의존 작업: $id -> $dep ($dep_status)"
    fi
  done
  if [ "$status" = blocked ] && [ "$blocked" = dependency ] && [ "$unmet" -eq 0 ]; then
    fail "dependency 차단 사유 불일치: $id"
  fi
done < "$meta"

while IFS='|' read -r id status type depends group blocked owned file; do
  [ -n "$group" ] || continue
  paths=$(printf '%s' "$owned" | sed 's/^\[//; s/\]$//; s/"//g; s/,/\n/g; s/^ *//; s/ *$//')
  for path in $paths; do
    [ -n "$path" ] || continue
    conflicts=$(awk -F '|' -v self="$id" -v grp="$group" -v needle="\"$path\"" '
      $1 != self && $5 == grp && index($7, needle) { print $1; exit }
    ' "$meta")
    [ -z "$conflicts" ] || fail "병렬 파일 소유권 충돌: $id <-> $conflicts ($path)"
  done
done < "$meta"

while IFS='|' read -r id status type depends group blocked owned file; do
  count=$(grep -F -c "| $id |" "$dashboard" || true)
  [ "$count" -ne 0 ] || fail "대시보드 누락: $id"
  [ "$count" -eq 1 ] || fail "대시보드 중복: $id"
done < "$meta"

count=$(wc -l < "$meta" | tr -d ' ')
echo "하네스 검사 통과: ${count}개 작업 카드"
