---
id: P02-T01
title: 테이블·제약·인덱스 migration
status: review
type: migration
depends_on: ["P01-T01"]
parallel_group: "D-A"
owner: "Codex/p02_t01"
started_at: "2026-08-02T22:18:00+09:00"
blocked_reason: ""
owned_files: ["supabase/.gitignore", "supabase/config.toml", "supabase/migrations/202608020001_core_schema.sql", "supabase/tests/core_schema.sql"]
shared_files: []
implementation_commit: "3ee77ed"
reviewer: ""
review_commit: ""
---

# 목표

테이블·제약·인덱스 migration을 완료해 다음 의존 작업이 사용할 검증된 산출물을 제공한다.

# 범위

- 생성 또는 수정: supabase/.gitignore
- 생성 또는 수정: supabase/config.toml
- 생성 또는 수정: supabase/migrations/202608020001_core_schema.sql
- 생성 또는 수정: supabase/tests/core_schema.sql
- 공유 파일 수정 없음

# 제외

제품 설계의 명시적 제외 기능과 이 카드 뒤 작업의 기능은 추가하지 않는다.

# 선행조건과 차단 해제

P01-T01가 done이면 Supabase 로컬 CLI 설정을 확인한다. 원격 개발 프로젝트 적용 증거가 필요한 시점에는 `blocked_reason: external`로 바꾸고 프로젝트 접근 승인을 받은 뒤 진행한다.

# 파일

- supabase/.gitignore
- supabase/config.toml
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

- 환경 준비: Docker Desktop과 Supabase CLI 2.111.0을 확인하고 `supabase init`으로 로컬 설정을 생성했다. 초기 연결 거부는 테스트 RED로 세지 않고 로컬 DB 스택을 먼저 정상화했다.
- 진짜 RED: migration 없이 `npx supabase test db`를 실행해 17/17이 7개 테이블·인덱스 부재와 SQLSTATE `42P01`로 실패함을 확인했다.
- 최초 구현 커밋: `b4965ea` (`데이터: 테이블·제약·인덱스 migration`). 7개 테이블, 별명·회차·첨부·용량 제약과 검색·정렬 인덱스를 추가했다.
- 리뷰 보강 커밋: `355e703` (`테스트: 첨부와 저장 설정 제약 보강`). 첨부 정상/거부, 용량 초기값, FK 삭제 동작을 포함해 28개 assertion으로 확대했다.
- Mutation RED: 첨부 대상 CHECK를 로컬 DB에서 임시 제거하자 신규 거부 assertion 2개만 2/28 실패했고 reset으로 복구 후 모두 통과했다.
- 최종 구현 커밋: `3ee77ed` (`테스트: 저장 설정 ID 제약 보강`). `storage_settings.id=false` 거부를 추가해 총 29개 assertion을 갖췄다.
- Mutation RED: `storage_settings_id_check`를 임시 제거하자 신규 assertion 하나만 1/29 실패했고 reset 복구 후 29/29 통과했다.
- GREEN: 공유 DB 경합을 제거한 단독 실행에서 `npx supabase --agent no db reset && npx supabase --agent no test db`가 종료 코드 0으로 migration을 재적용하고 29개 pgTAP 검사를 통과했다. `--agent no`는 로컬 검사와 무관한 CLI 에이전트 프로필 조회만 비활성화한다.
- 공통 검증: `npm run lint`, `npm run typecheck`, `npm run test` 3개, `npm run test:e2e` 2개, `npm run build`, `./scripts/check-harness.sh`가 통과했다.
- 독립 재검토: `Codex/p02_t01_review`가 스키마, 정상·거부 경계, mutation 포착력, 소유권과 비밀 부재를 확인해 Critical/Important 잔여 없음으로 승인했다.

# 커밋

권장 메시지: 데이터: 테이블·제약·인덱스 migration
