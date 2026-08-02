---
id: P02-T03
title: 비공개 Storage 정책과 DB 생성 타입
status: done
type: migration
depends_on: ["P02-T02"]
parallel_group: ""
owner: "Codex/p02_t03"
started_at: "2026-08-02T23:36:35+09:00"
blocked_reason: ""
owned_files: ["supabase/migrations/202608020003_storage.sql", "src/types/database.ts", "supabase/tests/storage.sql", "src/types/index.ts"]
shared_files: []
implementation_commit: "7a60725"
reviewer: "Codex/p02_t03_policy"
review_commit: "7f8f166"
---

# 목표

비공개 Storage 정책과 DB 생성 타입을 완료해 다음 의존 작업이 사용할 검증된 산출물을 제공한다.

# 범위

- 생성 또는 수정: supabase/migrations/202608020003_storage.sql
- 생성 또는 수정: src/types/database.ts
- 생성 또는 수정: supabase/tests/storage.sql
- 생성 또는 수정: src/types/index.ts

# 제외

제품 설계의 명시적 제외 기능과 이 카드 뒤 작업의 기능은 추가하지 않는다.

# 선행조건과 차단 해제

P02-T02가 모두 done이면 ready로 전환한다.

# 파일

- supabase/migrations/202608020003_storage.sql
- src/types/database.ts
- supabase/tests/storage.sql
- src/types/index.ts

# 인터페이스

선행 카드가 제공한 공개 타입과 동작만 소비한다. 이 카드의 파일과 검증 결과가 후속 카드의 계약이다.

# 실행 순서

1. AGENTS.md와 이 카드를 읽고 ready 여부를 확인한 뒤 owner, started_at, status를 갱신한다.
2. 인수 조건을 가장 좁게 증명하는 실패 테스트를 owned_files의 테스트 경로에 먼저 작성한다.
3. 다음 작업 전 검사를 실행한다: supabase test db
4. 기대 결과를 확인한다: 비공개 버킷 정책이 없어 실패.
5. 범위 안의 최소 변경만 구현한다.
6. 다음 통과 검사를 실행한다: supabase db reset && supabase test db && npm run typecheck
7. ./scripts/check-harness.sh와 사용 가능한 공통 완료 명령을 실행한다.
8. 카드와 대시보드를 review로 바꾸고 구현 커밋을 기록한다.
9. 구현자와 다른 리뷰어가 승인하면 reviewer, review_commit과 done 상태를 같은 커밋에 기록한다.

# 검증

- 증거 유형: RED/GREEN
- 작업 전 필수 행동: 실패 테스트를 먼저 작성한다.
- 작업 전 명령: supabase test db
- 예상 작업 전 결과: 비공개 버킷 정책이 없어 실패
- 완료 명령: supabase db reset && supabase test db && npm run typecheck
- 기대 완료 결과: 비인가 객체 접근은 거부되고 생성 DB 타입이 컴파일된다.

# 인수 조건

- 비인가 객체 접근은 거부되고 생성 DB 타입이 컴파일된다.
- 정상 경로와 거부 경계가 검증된다.
- 비밀 값, 범위 밖 변경과 병렬 소유권 충돌이 없다.
- 카드, 대시보드, 구현 및 리뷰 커밋이 일치한다.

# 리뷰 증거

- RED: 테스트 선작성 커밋 `55c7762`에서 `npx supabase --agent no test db supabase/tests/storage.sql`을 실행해 `attachments` 버킷 부재와 service role 객체 삽입 FK 오류(`23503`)를 확인했다.
- 정책 보강 RED: 임시 `authenticated` SELECT 정책을 로컬 DB에 주입했을 때 새 정책 카탈로그·회원·운영자 SELECT 검사 3개가 실패하고, 제거 후 Storage 24/24가 통과했다.
- GREEN: `npx supabase --agent no db reset && npx supabase --agent no test db`에서 core/RLS/Storage 합계 134개 pgTAP 검사가 통과했다.
- 생성 타입: Supabase CLI `2.111.0`의 `gen types typescript --local --schema public` 출력 EOF를 단일 LF로 정규화해 `src/types/database.ts`를 생성했고, 재생성 비교와 `npm run typecheck`가 통과했다.
- 공통 검사: `./scripts/check-harness.sh`, `npm run lint`, `npm run typecheck`, `npm run test`(3), `npm run test:e2e`(2), `npm run build`, `git diff --check`가 모두 통과했다.
- 구현 커밋: `7a60725` (RED `55c7762`, migration `87d7d92`, 타입 `cbb7db0`, EOF 정리 `064acc7` 포함)
- 독립 리뷰: `Codex/p02_t03_policy`가 실제 객체 기반 역할별 직접 CRUD 거부와 service role 삭제 경계를, `Codex/p02_t03_types`가 public 생성 타입·export·비밀 비노출을 검토해 Critical/Important 없음으로 승인했다.
- 승인 커밋: `7f8f166` (`리뷰: P02-T03 독립 승인`)

# 커밋

권장 메시지: 데이터: 비공개 Storage 정책과 DB 생성 타입
