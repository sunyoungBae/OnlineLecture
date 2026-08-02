---
id: P02-T01
title: 테이블·제약·인덱스 migration
status: blocked
type: migration
depends_on: ["P01-T01"]
parallel_group: "D-A"
owner: ""
started_at: ""
blocked_reason: dependency
owned_files: ["supabase/migrations/202608020001_core_schema.sql", "supabase/tests/core_schema.sql"]
shared_files: []
implementation_commit: ""
reviewer: ""
review_commit: ""
---

# 목표

테이블·제약·인덱스 migration을 완료해 다음 의존 작업이 사용할 검증된 산출물을 제공한다.

# 범위

- 생성 또는 수정: supabase/migrations/202608020001_core_schema.sql
- 생성 또는 수정: supabase/tests/core_schema.sql
- 공유 파일 수정 없음

# 제외

제품 설계의 명시적 제외 기능과 이 카드 뒤 작업의 기능은 추가하지 않는다.

# 선행조건과 차단 해제

P01-T01가 done이면 Supabase 로컬 CLI 설정을 확인한다. 원격 개발 프로젝트 적용 증거가 필요한 시점에는 `blocked_reason: external`로 바꾸고 프로젝트 접근 승인을 받은 뒤 진행한다.

# 파일

- supabase/migrations/202608020001_core_schema.sql
- supabase/tests/core_schema.sql

# 인터페이스

선행 카드가 제공한 공개 타입과 동작만 소비한다. 이 카드의 파일과 검증 결과가 후속 카드의 계약이다.

# 실행 순서

1. AGENTS.md와 이 카드를 읽고 ready 여부를 확인한 뒤 owner, started_at, status를 갱신한다.
2. 인수 조건을 가장 좁게 증명하는 실패 테스트를 owned_files의 테스트 경로에 먼저 작성한다.
3. 다음 작업 전 검사를 실행한다: supabase test db
4. 기대 결과를 확인한다: 테이블과 제약이 없어 SQL 검사가 실패.
5. 범위 안의 최소 변경만 구현한다.
6. 다음 통과 검사를 실행한다: supabase db reset && supabase test db
7. ./scripts/check-harness.sh와 사용 가능한 공통 완료 명령을 실행한다.
8. 카드와 대시보드를 review로 바꾸고 구현 커밋을 기록한다.
9. 구현자와 다른 리뷰어가 승인하면 reviewer, review_commit과 done 상태를 같은 커밋에 기록한다.

# 검증

- 증거 유형: RED/GREEN
- 작업 전 필수 행동: 실패 테스트를 먼저 작성한다.
- 작업 전 명령: supabase test db
- 예상 작업 전 결과: 테이블과 제약이 없어 SQL 검사가 실패
- 완료 명령: supabase db reset && supabase test db
- 기대 완료 결과: 7개 테이블, 별명 유일성, 회차 순서와 검색 인덱스가 확인된다.

# 인수 조건

- 7개 테이블, 별명 유일성, 회차 순서와 검색 인덱스가 확인된다.
- 정상 경로와 거부 경계가 검증된다.
- 비밀 값, 범위 밖 변경과 병렬 소유권 충돌이 없다.
- 카드, 대시보드, 구현 및 리뷰 커밋이 일치한다.

# 리뷰 증거

작업 전 실패, 완료 명령 결과, 구현 커밋, 구현자와 다른 리뷰어, 승인 커밋을 이 절에 기록한다.

# 커밋

권장 메시지: 데이터: 테이블·제약·인덱스 migration
