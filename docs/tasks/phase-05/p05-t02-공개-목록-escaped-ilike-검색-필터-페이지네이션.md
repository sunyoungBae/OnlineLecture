---
id: P05-T02
title: 공개 목록·escaped ILIKE 검색·필터·페이지네이션
status: done
type: feature
depends_on: ["P05-T01"]
parallel_group: ""
owner: "Codex/p05_t02"
started_at: "2026-08-08T09:23:26+09:00"
blocked_reason: ""
owned_files: ["src/features/posts/search.ts", "src/features/posts/search.test.ts", "src/app/board/page.tsx", "src/app/board/page.test.tsx"]
shared_files: ["src/components/site-header.tsx"]
implementation_commit: "f682de3"
reviewer: "Codex/p04_t02"
review_commit: "1978c80"
---

# 목표

공개 목록·escaped ILIKE 검색·필터·페이지네이션을 완료해 다음 의존 작업이 사용할 검증된 산출물을 제공한다.

# 범위

- 생성 또는 수정: src/features/posts/search.ts
- 생성 또는 수정: src/features/posts/search.test.ts
- 생성 또는 수정: src/app/board/page.tsx
- 생성 또는 수정: src/app/board/page.test.tsx
- 통합 소유 시에만 수정: src/components/site-header.tsx

# 제외

제품 설계의 명시적 제외 기능과 이 카드 뒤 작업의 기능은 추가하지 않는다.

# 선행조건과 차단 해제

P05-T01가 모두 done이면 ready로 전환한다.

# 파일

- src/features/posts/search.ts
- src/features/posts/search.test.ts
- src/app/board/page.tsx
- src/app/board/page.test.tsx
- src/components/site-header.tsx

# 인터페이스

선행 카드가 제공한 공개 타입과 동작만 소비한다. 이 카드의 파일과 검증 결과가 후속 카드의 계약이다.

# 실행 순서

1. AGENTS.md와 이 카드를 읽고 ready 여부를 확인한 뒤 owner, started_at, status를 갱신한다.
2. 인수 조건을 가장 좁게 증명하는 실패 테스트를 owned_files의 테스트 경로에 먼저 작성한다.
3. 다음 작업 전 검사를 실행한다: npm run test -- src/features/posts/search.test.ts
4. 기대 결과를 확인한다: 검색 파서와 escape가 없어 실패.
5. 범위 안의 최소 변경만 구현한다.
6. 다음 통과 검사를 실행한다: npm run test -- src/features/posts/search.test.ts && npm run typecheck
7. ./scripts/check-harness.sh와 사용 가능한 공통 완료 명령을 실행한다.
8. 카드와 대시보드를 review로 바꾸고 구현 커밋을 기록한다.
9. 구현자와 다른 리뷰어가 승인하면 reviewer, review_commit과 done 상태를 같은 커밋에 기록한다.

# 검증

- 증거 유형: RED/GREEN
- 작업 전 필수 행동: 실패 테스트를 먼저 작성한다.
- 작업 전 명령: npm run test -- src/features/posts/search.test.ts
- 예상 작업 전 결과: 검색 파서와 escape가 없어 실패
- 완료 명령: npm run test -- src/features/posts/search.test.ts && npm run typecheck
- 기대 완료 결과: 특수문자 escape, 강의 필터, 공지 우선 최신순과 20개 페이지가 통과한다.

# 인수 조건

- 특수문자 escape, 강의 필터, 공지 우선 최신순과 20개 페이지가 통과한다.
- 정상 경로와 거부 경계가 검증된다.
- 비밀 값, 범위 밖 변경과 병렬 소유권 충돌이 없다.
- 카드, 대시보드, 구현 및 리뷰 커밋이 일치한다.

# 리뷰 증거

- RED: 검색 파서와 공개 게시판 서버 페이지 부재로 좁은 테스트가 실패했고, 리뷰 보강에서 unsafe integer와 Infinity 페이지가 그대로 통과했다.
- GREEN: 검색·페이지 11개 테스트가 Zod URL 파라미터, escaped ILIKE, 공개 query·강의 필터·공지 우선 최신순·20개 범위, 빈·오류 상태와 최대 page 10,000을 검증하며 통과했다.
- 검증: `npm run lint`, `npm run typecheck`, 전체 unit 150개, E2E 16개와 `./scripts/check-harness.sh`가 통과했다. 구현 완료 시 build와 audit 0건도 확인했다.
- 구현 커밋: `f682de3` (검색 파서 `9f0ea6b`, 공개 페이지 `aed5d08` 포함)
- 독립 리뷰: `Codex/p04_t02`가 공개 접근, 검색 escape, 필터·정렬·범위, 오류 비노출과 페이지 상한을 검토해 Critical/Important 없음으로 승인했다.
- 승인 커밋: `1978c80` (`리뷰: P05-T02 독립 승인`)

# 커밋

권장 메시지: 기능: 공개 목록·escaped ILIKE 검색·필터·페이지네이션
