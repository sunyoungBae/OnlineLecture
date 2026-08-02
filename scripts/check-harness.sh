#!/bin/sh
set -eu

root=${HARNESS_ROOT:-.}
cards_dir="$root/docs/tasks"
dashboard="$cards_dir/README.md"
master_plan="$root/docs/superpowers/plans/2026-08-02-online-lecture-mvp.md"

fail() {
  echo "하네스 검사 실패: $*" >&2
  exit 1
}

[ -d "$cards_dir" ] || fail "작업 카드 디렉터리 없음"
[ -f "$dashboard" ] || fail "대시보드 없음"
[ -f "$master_plan" ] || fail "마스터 계획 없음"

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
  shared=$(value_of shared_files "$file")
  owner=$(value_of owner "$file" | sed 's/^"//; s/"$//')
  started=$(value_of started_at "$file" | sed 's/^"//; s/"$//')
  implementation=$(value_of implementation_commit "$file" | sed 's/^"//; s/"$//')
  reviewer=$(value_of reviewer "$file" | sed 's/^"//; s/"$//')
  review_commit=$(value_of review_commit "$file" | sed 's/^"//; s/"$//')

  printf '%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s\n' \
    "$id" "$status" "$type" "$depends" "$group" "$blocked" "$owned" "$shared" \
    "$owner" "$started" "$implementation" "$reviewer" "$review_commit" "$file" >> "$meta"
done < "$cards"

duplicate=$(cut -d '|' -f1 "$meta" | sort | uniq -d | sed -n '1p')
[ -z "$duplicate" ] || fail "중복 작업 ID: $duplicate"

while IFS='|' read -r id status type depends group blocked owned shared owner started implementation reviewer review_commit file; do
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
  case "$status" in
    in_progress)
      [ -n "$owner" ] && [ -n "$started" ] || fail "담당자와 시작 시각 필요: $id"
      ;;
    review)
      [ -n "$owner" ] && [ -n "$started" ] || fail "담당자와 시작 시각 필요: $id"
      printf '%s\n' "$implementation" | grep -Eq '^[0-9a-f]{7,40}$' || fail "구현 커밋 필요: $id"
      ;;
    done)
      [ -n "$owner" ] && [ -n "$started" ] || fail "담당자와 시작 시각 필요: $id"
      printf '%s\n' "$implementation" | grep -Eq '^[0-9a-f]{7,40}$' || fail "구현 커밋 필요: $id"
      [ -n "$reviewer" ] && [ "$reviewer" != "$owner" ] || fail "독립 리뷰어 필요: $id"
      printf '%s\n' "$review_commit" | grep -Eq '^[0-9a-f]{7,40}$' || fail "승인 커밋 필요: $id"
      ;;
  esac
done < "$meta"

while IFS='|' read -r id status type depends group blocked owned shared owner started implementation reviewer review_commit file; do
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

conflict=$(awk -F '|' '
  function clean(s) { gsub(/^\[|\]$/, "", s); gsub(/"/, "", s); return s }
  function trim(s) { gsub(/^ +| +$/, "", s); return s }
  function overlaps(a,b) { return a == b || index(a, b "/") == 1 || index(b, a "/") == 1 }
  {
    ids[NR]=$1; groups[NR]=$5; owned[NR]=clean($7)
  }
  END {
    for (i=1; i<=NR; i++) for (j=i+1; j<=NR; j++) {
      if (groups[i] == "" || groups[i] != groups[j]) continue
      ni=split(owned[i], ai, ","); nj=split(owned[j], aj, ",")
      for (x=1; x<=ni; x++) for (y=1; y<=nj; y++) {
        a=trim(ai[x]); b=trim(aj[y])
        if (a != "" && b != "" && overlaps(a,b)) { print ids[i] " <-> " ids[j] " (" a " / " b ")"; exit }
      }
    }
  }
' "$meta")
[ -z "$conflict" ] || fail "병렬 파일 소유권 충돌: $conflict"

orphan=$(awk -F '|' '
  function clean(s) { gsub(/^\[|\]$/, "", s); gsub(/"/, "", s); return s }
  function trim(s) { gsub(/^ +| +$/, "", s); return s }
  function covers(owner,shared) { return owner == shared || index(shared, owner "/") == 1 }
  {
    owned[NR]=clean($7); shared[NR]=clean($8)
  }
  END {
    for (i=1; i<=NR; i++) {
      ns=split(shared[i], ss, ",")
      for (s=1; s<=ns; s++) {
        target=trim(ss[s]); if (target == "") continue
        count=0
        for (j=1; j<=NR; j++) {
          no=split(owned[j], oo, ",")
          for (o=1; o<=no; o++) if (covers(trim(oo[o]), target)) count++
        }
        if (count == 0) { print target; exit }
      }
    }
  }
' "$meta")
[ -z "$orphan" ] || fail "공유 파일 통합 소유자 없음: $orphan"

while IFS='|' read -r id status type depends group blocked owned shared owner started implementation reviewer review_commit file; do
  count=$(grep -F -c "| $id |" "$dashboard" || true)
  [ "$count" -ne 0 ] || fail "대시보드 누락: $id"
  [ "$count" -eq 1 ] || fail "대시보드 중복: $id"
done < "$meta"

card_ids="$tmp_dir/card-ids.txt"
plan_ids="$tmp_dir/plan-ids.txt"
cut -d '|' -f1 "$meta" | sort > "$card_ids"
sed -n 's/^| \(P[0-9][0-9]-T[0-9][0-9]\) |.*/\1/p' "$master_plan" | sort -u > "$plan_ids"
cmp -s "$card_ids" "$plan_ids" || fail "마스터 계획 불일치"

count=$(wc -l < "$meta" | tr -d ' ')
echo "하네스 검사 통과: ${count}개 작업 카드"
