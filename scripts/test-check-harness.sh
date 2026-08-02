#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
checker="$repo_root/scripts/check-harness.sh"

if [ ! -x "$checker" ]; then
  echo "검사기 실행 파일이 없습니다: $checker" >&2
  exit 1
fi

tmp_root=$(mktemp -d "${TMPDIR:-/tmp}/online-lecture-harness.XXXXXX")
trap 'rm -rf "$tmp_root"' 0 HUP INT TERM

write_card() {
  root=$1
  file=$2
  id=$3
  status=$4
  depends=$5
  group=$6
  blocked=$7
  owned=$8
  implementation=${9:-}
  shared=${10:-[]}
  owner='""'
  started='""'
  reviewer='""'
  review_commit='""'
  if [ "$status" = review ]; then
    owner='"작업자"'
    started='"2026-08-02T00:00:00+09:00"'
  elif [ "$status" = done ]; then
    owner='"작업자"'
    started='"2026-08-02T00:00:00+09:00"'
    reviewer='"리뷰어"'
    review_commit='"abcdef2"'
  fi
  mkdir -p "$root/docs/tasks/phase-01"
  printf '%s\n' \
    '---' \
    "id: $id" \
    "title: $id 검사 카드" \
    "status: $status" \
    'type: feature' \
    "depends_on: $depends" \
    "parallel_group: \"$group\"" \
    "owner: $owner" \
    "started_at: $started" \
    "blocked_reason: $blocked" \
    "owned_files: $owned" \
    "shared_files: $shared" \
    "implementation_commit: \"$implementation\"" \
    "reviewer: $reviewer" \
    "review_commit: $review_commit" \
    '---' \
    '' \
    '# 목표' > "$root/docs/tasks/phase-01/$file"
}

write_dashboard() {
  root=$1
  shift
  mkdir -p "$root/docs/tasks"
  {
    printf '%s\n' '# 대시보드' '| ID | 작업 | 상태 |'
    for id in "$@"; do
      printf '| %s | 검사 | blocked |\n' "$id"
    done
  } > "$root/docs/tasks/README.md"
}

write_master_plan() {
  root=$1
  shift
  mkdir -p "$root/docs/superpowers/plans"
  {
    printf '%s\n' '# 마스터 계획' '| ID | 산출물 |'
    for id in "$@"; do
      printf '| %s | 검사 |\n' "$id"
    done
  } > "$root/docs/superpowers/plans/2026-08-02-online-lecture-mvp.md"
}

new_fixture() {
  name=$1
  root="$tmp_root/$name"
  mkdir -p "$root"
  write_card "$root" a.md P01-T01 done '[]' A '""' '["src/a.ts"]' abcdef1
  write_card "$root" b.md P01-T02 ready '["P01-T01"]' A '""' '["src/b.ts"]'
  write_dashboard "$root" P01-T01 P01-T02
  write_master_plan "$root" P01-T01 P01-T02
  printf '%s\n' "$root"
}

expect_pass() {
  root=$1
  HARNESS_ROOT="$root" HARNESS_EXPECTED_COUNT=2 "$checker" >/dev/null
}

expect_fail() {
  root=$1
  expected=$2
  expected_count=${3:-2}
  output="$tmp_root/output.txt"
  if HARNESS_ROOT="$root" HARNESS_EXPECTED_COUNT="$expected_count" "$checker" >"$output" 2>&1; then
    echo "실패해야 하는 fixture가 통과했습니다: $expected" >&2
    exit 1
  fi
  if ! grep -F "$expected" "$output" >/dev/null; then
    echo "예상 진단을 찾지 못했습니다: $expected" >&2
    sed -n '1,120p' "$output" >&2
    exit 1
  fi
}

root=$(new_fixture valid)
expect_pass "$root"

root=$(new_fixture duplicate-id)
write_card "$root" c.md P01-T02 blocked '["P01-T01"]' B dependency '["src/c.ts"]'
expect_fail "$root" '중복 작업 ID' 3

root=$(new_fixture unknown-dependency)
write_card "$root" b.md P01-T02 blocked '["P99-T99"]' A dependency '["src/b.ts"]'
expect_fail "$root" '알 수 없는 의존 작업'

root=$(new_fixture invalid-status)
write_card "$root" b.md P01-T02 waiting '["P01-T01"]' A '""' '["src/b.ts"]'
expect_fail "$root" '허용되지 않은 상태'

root=$(new_fixture missing-blocker)
write_card "$root" b.md P01-T02 blocked '["P01-T01"]' A '""' '["src/b.ts"]'
expect_fail "$root" 'blocked_reason 필요'

root=$(new_fixture unexpected-blocker)
write_card "$root" b.md P01-T02 ready '["P01-T01"]' A dependency '["src/b.ts"]'
expect_fail "$root" 'blocked_reason은 빈 값이어야 함'

root=$(new_fixture ownership-overlap)
write_card "$root" b.md P01-T02 ready '["P01-T01"]' A '""' '["src/a.ts"]'
expect_fail "$root" '병렬 파일 소유권 충돌'

root=$(new_fixture nested-ownership-overlap)
write_card "$root" b.md P01-T02 ready '["P01-T01"]' A '""' '["src/a.ts/child.ts"]'
expect_fail "$root" '병렬 파일 소유권 충돌'

root=$(new_fixture orphan-shared-file)
write_card "$root" b.md P01-T02 ready '["P01-T01"]' A '""' '["src/b.ts"]' '' '["src/orphan.ts"]'
expect_fail "$root" '공유 파일 통합 소유자 없음'

root=$(new_fixture unfinished-dependency)
write_card "$root" a.md P01-T01 blocked '[]' A external '["src/a.ts"]'
expect_fail "$root" '미완료 의존 작업'

root=$(new_fixture resolved-dependency-blocked)
write_card "$root" b.md P01-T02 blocked '["P01-T01"]' A dependency '["src/b.ts"]'
expect_fail "$root" 'dependency 차단 사유 불일치'

root=$(new_fixture dashboard-missing)
write_dashboard "$root" P01-T01
expect_fail "$root" '대시보드 누락'

root=$(new_fixture dashboard-duplicate)
write_dashboard "$root" P01-T01 P01-T02 P01-T02
expect_fail "$root" '대시보드 중복'

root=$(new_fixture master-traceability)
rm "$root/docs/tasks/phase-01/b.md"
write_dashboard "$root" P01-T01
expect_fail "$root" '마스터 계획 불일치' 1

root=$(new_fixture missing-review-evidence)
write_card "$root" b.md P01-T02 review '["P01-T01"]' A '""' '["src/b.ts"]'
expect_fail "$root" '구현 커밋 필요'

root=$(new_fixture invalid-started-at)
write_card "$root" b.md P01-T02 review '["P01-T01"]' A '""' '["src/b.ts"]' abcdef1
sed 's/2026-08-02T00:00:00+09:00/2026-08-02/' "$root/docs/tasks/phase-01/b.md" > "$root/docs/tasks/phase-01/b.tmp"
mv "$root/docs/tasks/phase-01/b.tmp" "$root/docs/tasks/phase-01/b.md"
expect_fail "$root" '시작 시각 형식 오류'

root=$(new_fixture fixed-card-count)
output="$tmp_root/count-output.txt"
if HARNESS_ROOT="$root" HARNESS_EXPECTED_COUNT=3 "$checker" >"$output" 2>&1; then
  echo '고정 카드 수 불일치 fixture가 통과했습니다.' >&2
  exit 1
fi
grep -F '작업 카드 수 불일치' "$output" >/dev/null

echo '하네스 검사기 테스트 통과: 17개 시나리오'
