---
id: P04-T03
title: 운영자 회차 CRUD·위아래 순서 이동
status: review
type: feature
depends_on: ["P04-T02"]
parallel_group: ""
owner: "Codex/p04_t03"
started_at: "2026-08-08T09:18:07+09:00"
blocked_reason: ""
owned_files: ["src/app/admin/courses/[courseId]/lessons/page.tsx", "src/app/admin/courses/[courseId]/lessons/page.test.tsx", "src/app/admin/courses/[courseId]/lessons/actions.ts", "src/features/admin/lesson-order.ts", "src/features/admin/lesson-order.test.ts", "supabase/migrations/202608080001_move_lesson.sql", "supabase/tests/move_lesson.sql"]
shared_files: ["src/app/admin/courses/page.tsx", "src/types/database.ts"]
implementation_commit: "9c9dd78"
reviewer: ""
review_commit: ""
---

# 목표

운영자 회차 CRUD·위아래 순서 이동을 완료해 다음 의존 작업이 사용할 검증된 산출물을 제공한다.

# 범위

- 생성 또는 수정: src/app/admin/courses/[courseId]/lessons/page.tsx
- 생성 또는 수정: src/app/admin/courses/[courseId]/lessons/page.test.tsx
- 생성 또는 수정: src/app/admin/courses/[courseId]/lessons/actions.ts
- 생성 또는 수정: src/features/admin/lesson-order.ts
- 생성 또는 수정: src/features/admin/lesson-order.test.ts
- 생성 또는 수정: supabase/migrations/202608080001_move_lesson.sql
- 생성 또는 수정: supabase/tests/move_lesson.sql
- 통합 소유 시에만 수정: src/types/database.ts
- 통합 소유 시에만 수정: src/app/admin/courses/page.tsx

# 제외

제품 설계의 명시적 제외 기능과 이 카드 뒤 작업의 기능은 추가하지 않는다.

# 선행조건과 차단 해제

P04-T02가 모두 done이면 ready로 전환한다.

# 파일

- src/app/admin/courses/[courseId]/lessons/page.tsx
- src/app/admin/courses/[courseId]/lessons/page.test.tsx
- src/app/admin/courses/[courseId]/lessons/actions.ts
- src/features/admin/lesson-order.ts
- src/features/admin/lesson-order.test.ts
- supabase/migrations/202608080001_move_lesson.sql
- supabase/tests/move_lesson.sql
- src/app/admin/courses/page.tsx
- src/types/database.ts

# 인터페이스

선행 카드가 제공한 공개 타입과 동작만 소비한다. 이 카드의 파일과 검증 결과가 후속 카드의 계약이다.

# 실행 순서

1. AGENTS.md와 이 카드를 읽고 ready 여부를 확인한 뒤 owner, started_at, status를 갱신한다.
2. 인수 조건을 가장 좁게 증명하는 실패 테스트를 owned_files의 테스트 경로에 먼저 작성한다.
3. 다음 작업 전 검사를 실행한다: npm run test -- src/features/admin/lesson-order.test.ts && supabase test db supabase/tests/move_lesson.sql
4. 기대 결과를 확인한다: 회차 순서 함수와 관리자 전용 원자 이동 RPC가 없어 실패.
5. 범위 안의 최소 변경만 구현한다.
6. 다음 통과 검사를 실행한다: npm run test -- src/features/admin/lesson-order.test.ts && supabase db reset && supabase test db && npm run typecheck
7. ./scripts/check-harness.sh와 사용 가능한 공통 완료 명령을 실행한다.
8. 카드와 대시보드를 review로 바꾸고 구현 커밋을 기록한다.
9. 구현자와 다른 리뷰어가 승인하면 reviewer, review_commit과 done 상태를 같은 커밋에 기록한다.

# 검증

- 증거 유형: RED/GREEN
- 작업 전 필수 행동: 실패 테스트를 먼저 작성한다.
- 작업 전 명령: npm run test -- src/features/admin/lesson-order.test.ts && supabase test db supabase/tests/move_lesson.sql
- 예상 작업 전 결과: 회차 순서 함수와 관리자 전용 원자 이동 RPC가 없어 실패
- 완료 명령: npm run test -- src/features/admin/lesson-order.test.ts && supabase db reset && supabase test db && npm run typecheck
- 기대 완료 결과: 회차 CRUD와 첫·중간·마지막 위아래 이동 및 관리자 전용 원자성 경계가 통과한다.

# 인수 조건

- 회차 CRUD와 첫·중간·마지막 위아래 이동 경계가 통과한다.
- 순서 이동 RPC는 관리자만 실행할 수 있고 같은 강의 행을 잠근 한 트랜잭션에서 유일성을 보존한다.
- 정상 경로와 거부 경계가 검증된다.
- 비밀 값, 범위 밖 변경과 병렬 소유권 충돌이 없다.
- 카드, 대시보드, 구현 및 리뷰 커밋이 일치한다.

# 리뷰 증거

- RED: 회차 순서·액션 모듈과 페이지 피드백 계약 부재로 좁은 테스트가 실패했고, 리뷰 보강에서 stale 0행·설명 길이·DB 원문 비노출 경계가 실패했다.
- GREEN: 순서·CRUD 액션·페이지 19개 테스트가 인증 우선, 입력·YouTube 검증, 영향 행, 고정 성공·오류 안내와 원문 비노출을 검증하며 통과했다.
- DB GREEN: 사용자가 로컬에서 reset과 전체 pgTAP을 실행해 6개 파일, 172개 테스트 모두 `Result: PASS`를 확인했다. 관리자 전용 RPC, 첫·중간·마지막 이동, 타 강의 불변과 position 유일성을 포함한다.
- 공통 검사: 구현 최종 보강 시 전체 unit 163개, lint, typecheck, build, E2E 16개와 `./scripts/check-harness.sh`가 통과했다. 이후 독립 검증의 좁은 19개도 통과했다.
- 구현 커밋: `9c9dd78` (원자 RPC `dbbb8ee`, CRUD UI `5fc78d0`, pgTAP `ae544be`, 리뷰 보강 `055f3e5`, `2240f37`, `1f0855d` 포함)
- 독립 리뷰: `Codex/p04_t02`가 RPC 권한·잠금·유일성, CRUD 권한·입력·영향 행·오류 및 페이지 피드백을 검토해 Critical/Important 없음으로 승인했다.

# 커밋

권장 메시지: 기능: 운영자 회차 CRUD·위아래 순서 이동
