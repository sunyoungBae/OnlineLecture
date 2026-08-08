---
id: P05-T03
title: 댓글 CRUD·공지·운영자 삭제
status: review
type: feature
depends_on: ["P05-T02"]
parallel_group: ""
owner: "Codex/p05_t03"
started_at: "2026-08-08T09:41:13+09:00"
blocked_reason: ""
owned_files: ["src/features/comments/actions.ts", "src/features/comments/actions.test.ts", "src/features/moderation/actions.ts", "src/features/moderation/actions.test.ts", "src/app/board/[postId]/page.tsx", "src/app/board/[postId]/page.test.tsx"]
shared_files: []
implementation_commit: "1ff2c6a"
reviewer: ""
review_commit: ""
---

# 목표

댓글 CRUD·공지·운영자 삭제을 완료해 다음 의존 작업이 사용할 검증된 산출물을 제공한다.

# 범위

- 생성 또는 수정: src/features/comments/actions.ts
- 생성 또는 수정: src/features/comments/actions.test.ts
- 생성 또는 수정: src/features/moderation/actions.ts
- 생성 또는 수정: src/features/moderation/actions.test.ts
- 생성 또는 수정: src/app/board/[postId]/page.tsx
- 생성 또는 수정: src/app/board/[postId]/page.test.tsx
- 공유 파일 수정 없음

# 제외

제품 설계의 명시적 제외 기능과 이 카드 뒤 작업의 기능은 추가하지 않는다.

# 선행조건과 차단 해제

P05-T02가 모두 done이면 ready로 전환한다.

# 파일

- src/features/comments/actions.ts
- src/features/comments/actions.test.ts
- src/features/moderation/actions.ts
- src/features/moderation/actions.test.ts
- src/app/board/[postId]/page.tsx
- src/app/board/[postId]/page.test.tsx

# 인터페이스

선행 카드가 제공한 공개 타입과 동작만 소비한다. 이 카드의 파일과 검증 결과가 후속 카드의 계약이다.

# 실행 순서

1. AGENTS.md와 이 카드를 읽고 ready 여부를 확인한 뒤 owner, started_at, status를 갱신한다.
2. 인수 조건을 가장 좁게 증명하는 실패 테스트를 owned_files의 테스트 경로에 먼저 작성한다.
3. 다음 작업 전 검사를 실행한다: npm run test -- src/features/comments/actions.test.ts
4. 기대 결과를 확인한다: 댓글 권한 로직이 없어 실패.
5. 범위 안의 최소 변경만 구현한다.
6. 다음 통과 검사를 실행한다: npm run test -- src/features/comments/actions.test.ts && npm run typecheck
7. ./scripts/check-harness.sh와 사용 가능한 공통 완료 명령을 실행한다.
8. 카드와 대시보드를 review로 바꾸고 구현 커밋을 기록한다.
9. 구현자와 다른 리뷰어가 승인하면 reviewer, review_commit과 done 상태를 같은 커밋에 기록한다.

# 검증

- 증거 유형: RED/GREEN
- 작업 전 필수 행동: 실패 테스트를 먼저 작성한다.
- 작업 전 명령: npm run test -- src/features/comments/actions.test.ts
- 예상 작업 전 결과: 댓글 권한 로직이 없어 실패
- 완료 명령: npm run test -- src/features/comments/actions.test.ts && npm run typecheck
- 기대 완료 결과: 1~2000자와 비회원·본인·타인·운영자 동작이 구분된다.

# 인수 조건

- 1~2000자와 비회원·본인·타인·운영자 동작이 구분된다.
- 정상 경로와 거부 경계가 검증된다.
- 비밀 값, 범위 밖 변경과 병렬 소유권 충돌이 없다.
- 카드, 대시보드, 구현 및 리뷰 커밋이 일치한다.

# 리뷰 증거

- RED: 댓글·관리 액션과 공개 상세 페이지 모듈 부재로 좁은 테스트가 실패했고, 리뷰 보강에서 운영자 댓글 삭제 액션 부재가 실패했다.
- GREEN: P05 좁은 10개 테스트가 댓글 길이·인증 작성자·소유권·0행/RLS, 관리자 공지·게시글/댓글 삭제, 오류 비노출과 공개 상세의 빈·오류·notFound를 검증하며 통과했다.
- 검증: 각 구현 단위의 typecheck가 통과했고 독립 재검증에서도 P05 좁은 테스트 10개와 typecheck가 통과했다.
- 구현 커밋: `1ff2c6a` (댓글 액션 `471010d`, 관리 액션 `4d2b1da`, 공개 상세 `b4d083c` 포함)
- 독립 리뷰: `Codex/p04_t01`이 댓글 작성자·관리자 권한, 영향 행, DB 원문 비노출과 공개 상세 경계를 검토해 Critical/Important 없음으로 승인했다.

# 커밋

권장 메시지: 기능: 댓글 CRUD·공지·운영자 삭제
