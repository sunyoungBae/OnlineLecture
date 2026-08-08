---
id: P04-T01
title: 회원 강의 목록·상세·YouTube 플레이어
status: review
type: feature
depends_on: ["P03-T03"]
parallel_group: "C-A"
owner: "Codex/p04_t01"
started_at: "2026-08-08T09:00:13+09:00"
blocked_reason: ""
owned_files: ["src/app/courses/page.tsx", "src/app/courses/page.test.tsx", "src/app/courses/[slug]/page.tsx", "src/app/courses/[slug]/page.test.tsx", "src/features/courses/youtube.ts", "src/features/courses/youtube.test.ts"]
shared_files: []
implementation_commit: "194d09e"
reviewer: ""
review_commit: ""
---

# 목표

회원 강의 목록·상세·YouTube 플레이어을 완료해 다음 의존 작업이 사용할 검증된 산출물을 제공한다.

# 범위

- 생성 또는 수정: src/app/courses/page.tsx
- 생성 또는 수정: src/app/courses/page.test.tsx
- 생성 또는 수정: src/app/courses/[slug]/page.tsx
- 생성 또는 수정: src/app/courses/[slug]/page.test.tsx
- 생성 또는 수정: src/features/courses/youtube.ts
- 생성 또는 수정: src/features/courses/youtube.test.ts
- 공유 파일 수정 없음

# 제외

제품 설계의 명시적 제외 기능과 이 카드 뒤 작업의 기능은 추가하지 않는다.

# 선행조건과 차단 해제

P03-T03가 done이면 단위 구현은 ready로 전환할 수 있다. 브라우저 영상 인수 전에는 `blocked_reason: external`로 바꾸고 공개 YouTube 테스트 영상 준비를 확인한다.

# 파일

- src/app/courses/page.tsx
- src/app/courses/page.test.tsx
- src/app/courses/[slug]/page.tsx
- src/app/courses/[slug]/page.test.tsx
- src/features/courses/youtube.ts
- src/features/courses/youtube.test.ts

# 인터페이스

선행 카드가 제공한 공개 타입과 동작만 소비한다. 이 카드의 파일과 검증 결과가 후속 카드의 계약이다.

# 실행 순서

1. AGENTS.md와 이 카드를 읽고 ready 여부를 확인한 뒤 owner, started_at, status를 갱신한다.
2. 인수 조건을 가장 좁게 증명하는 실패 테스트를 owned_files의 테스트 경로에 먼저 작성한다.
3. 다음 작업 전 검사를 실행한다: npm run test -- src/features/courses/youtube.test.ts
4. 기대 결과를 확인한다: YouTube URL 파서가 없어 실패.
5. 범위 안의 최소 변경만 구현한다.
6. 다음 통과 검사를 실행한다: npm run test -- src/features/courses/youtube.test.ts && npm run typecheck
7. ./scripts/check-harness.sh와 사용 가능한 공통 완료 명령을 실행한다.
8. 카드와 대시보드를 review로 바꾸고 구현 커밋을 기록한다.
9. 구현자와 다른 리뷰어가 승인하면 reviewer, review_commit과 done 상태를 같은 커밋에 기록한다.

# 검증

- 증거 유형: RED/GREEN
- 작업 전 필수 행동: 실패 테스트를 먼저 작성한다.
- 작업 전 명령: npm run test -- src/features/courses/youtube.test.ts
- 예상 작업 전 결과: YouTube URL 파서가 없어 실패
- 완료 명령: npm run test -- src/features/courses/youtube.test.ts && npm run typecheck
- 기대 완료 결과: 두 공식 도메인만 허용하고 ID·썸네일·빈 회차 UI가 확인된다.

# 인수 조건

- 두 공식 도메인만 허용하고 ID·썸네일·빈 회차 UI가 확인된다.
- 정상 경로와 거부 경계가 검증된다.
- 비밀 값, 범위 밖 변경과 병렬 소유권 충돌이 없다.
- 카드, 대시보드, 구현 및 리뷰 커밋이 일치한다.

# 리뷰 증거

- RED: YouTube 파서 모듈 부재로 좁은 테스트가 실패했고, 리뷰 보강에서는 서버 페이지 렌더 계약 부재로 목록·상세 테스트 9개가 실패했다.
- GREEN: YouTube 6개와 서버 페이지 9개, 총 15개 테스트가 통과했다.
- 검증: 회원 역할 가드, 공개 강의 필터, 다중 강의 첫 회차 썸네일, 빈 상태·DB 오류, 없는·미공개 slug의 notFound와 회차 순서를 확인했다. `npm run typecheck`, `npm run lint`, `./scripts/check-harness.sh`, 전체 unit 127개, E2E 16개와 build가 통과했다.
- 구현 커밋: `194d09e` (초기 구현 `ef4e966` 포함)
- 독립 리뷰: `Codex/p04_t02`가 확장된 페이지 계약과 YouTube 경계를 검토해 Critical/Important 없음으로 승인했다.

# 커밋

권장 메시지: 기능: 회원 강의 목록·상세·YouTube 플레이어
