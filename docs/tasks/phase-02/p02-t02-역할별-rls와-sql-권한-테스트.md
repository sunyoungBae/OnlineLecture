---
id: P02-T02
title: 역할별 RLS와 SQL 권한 테스트
status: in_progress
type: migration
depends_on: ["P02-T01"]
parallel_group: ""
owner: "Codex/p02_t02"
started_at: "2026-08-02T22:55:12+09:00"
blocked_reason: ""
owned_files: ["supabase/migrations/202608020002_rls.sql", "supabase/tests/rls.sql"]
shared_files: []
implementation_commit: ""
reviewer: ""
review_commit: ""
---

# 목표

역할별 RLS와 SQL 권한 테스트을 완료해 다음 의존 작업이 사용할 검증된 산출물을 제공한다.

# 범위

- 생성 또는 수정: supabase/migrations/202608020002_rls.sql
- 생성 또는 수정: supabase/tests/rls.sql
- 공유 파일 수정 없음

# 제외

제품 설계의 명시적 제외 기능과 이 카드 뒤 작업의 기능은 추가하지 않는다.

# 선행조건과 차단 해제

P02-T01가 모두 done이면 ready로 전환한다.

# 파일

- supabase/migrations/202608020002_rls.sql
- supabase/tests/rls.sql

# 인터페이스

선행 카드가 제공한 공개 타입과 동작만 소비한다. 이 카드의 파일과 검증 결과가 후속 카드의 계약이다.

# 실행 순서

1. AGENTS.md와 이 카드를 읽고 ready 여부를 확인한 뒤 owner, started_at, status를 갱신한다.
2. 인수 조건을 가장 좁게 증명하는 실패 테스트를 owned_files의 테스트 경로에 먼저 작성한다.
3. 다음 작업 전 검사를 실행한다: supabase test db
4. 기대 결과를 확인한다: RLS 정책이 없어 역할 거부 검사가 실패.
5. 범위 안의 최소 변경만 구현한다.
6. 다음 통과 검사를 실행한다: supabase db reset && supabase test db
7. ./scripts/check-harness.sh와 사용 가능한 공통 완료 명령을 실행한다.
8. 카드와 대시보드를 review로 바꾸고 구현 커밋을 기록한다.
9. 구현자와 다른 리뷰어가 승인하면 reviewer, review_commit과 done 상태를 같은 커밋에 기록한다.

# 검증

- 증거 유형: RED/GREEN
- 작업 전 필수 행동: 실패 테스트를 먼저 작성한다.
- 작업 전 명령: supabase test db
- 예상 작업 전 결과: RLS 정책이 없어 역할 거부 검사가 실패
- 완료 명령: supabase db reset && supabase test db
- 기대 완료 결과: 비회원·회원·작성자·운영자 허용 및 거부 행렬이 통과한다.

# 인수 조건

- 비회원·회원·작성자·운영자 허용 및 거부 행렬이 통과한다.
- 정상 경로와 거부 경계가 검증된다.
- 비밀 값, 범위 밖 변경과 병렬 소유권 충돌이 없다.
- 카드, 대시보드, 구현 및 리뷰 커밋이 일치한다.

# 리뷰 증거

작업 전 실패, 완료 명령 결과, 구현 커밋, 구현자와 다른 리뷰어, 승인 커밋을 이 절에 기록한다.

# 커밋

권장 메시지: 데이터: 역할별 RLS와 SQL 권한 테스트
