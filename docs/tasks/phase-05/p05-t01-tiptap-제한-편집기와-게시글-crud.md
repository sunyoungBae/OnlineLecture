---
id: P05-T01
title: Tiptap 제한 편집기와 게시글 CRUD
status: done
type: feature
depends_on: ["P03-T03"]
parallel_group: "B-A"
owner: "Codex/p05_t01"
started_at: "2026-08-08T09:00:13+09:00"
blocked_reason: ""
owned_files: ["src/features/posts/content.ts", "src/features/posts/content.test.ts", "src/features/posts/actions.ts", "src/features/posts/actions.test.ts", "src/features/posts/editor.tsx", "src/app/board/new/page.tsx", "src/app/board/[postId]/edit/page.tsx", "package.json", "package-lock.json", "README.md"]
shared_files: []
implementation_commit: "c29590b"
reviewer: "Codex/p04_t02"
review_commit: "863586a"
---

# 목표

Tiptap 제한 편집기와 게시글 CRUD을 완료해 다음 의존 작업이 사용할 검증된 산출물을 제공한다.

# 범위

- 생성 또는 수정: src/features/posts/content.ts
- 생성 또는 수정: src/features/posts/content.test.ts
- 생성 또는 수정: src/features/posts/actions.ts
- 생성 또는 수정: src/features/posts/actions.test.ts
- 생성 또는 수정: src/features/posts/editor.tsx
- 생성 또는 수정: src/app/board/new/page.tsx
- 생성 또는 수정: src/app/board/[postId]/edit/page.tsx
- 생성 또는 수정: package.json
- 생성 또는 수정: package-lock.json
- 생성 또는 수정: README.md

# 제외

제품 설계의 명시적 제외 기능과 이 카드 뒤 작업의 기능은 추가하지 않는다.

# 선행조건과 차단 해제

P03-T03가 모두 done이면 ready로 전환한다.

# 파일

- src/features/posts/content.ts
- src/features/posts/content.test.ts
- src/features/posts/actions.ts
- src/features/posts/actions.test.ts
- src/features/posts/editor.tsx
- src/app/board/new/page.tsx
- src/app/board/[postId]/edit/page.tsx
- package.json
- package-lock.json
- README.md

# 인터페이스

선행 카드가 제공한 공개 타입과 동작만 소비한다. 이 카드의 파일과 검증 결과가 후속 카드의 계약이다.

# 실행 순서

1. AGENTS.md와 이 카드를 읽고 ready 여부를 확인한 뒤 owner, started_at, status를 갱신한다.
2. 인수 조건을 가장 좁게 증명하는 실패 테스트를 owned_files의 테스트 경로에 먼저 작성한다.
3. 다음 작업 전 검사를 실행한다: npm run test -- src/features/posts/content.test.ts src/features/posts/actions.test.ts
4. 기대 결과를 확인한다: Tiptap JSON 검증과 인증 우선 서버 액션 계약이 없어 실패.
5. 범위 안의 최소 변경만 구현한다.
6. 다음 통과 검사를 실행한다: npm run test -- src/features/posts/content.test.ts src/features/posts/actions.test.ts && npm run typecheck
7. ./scripts/check-harness.sh와 사용 가능한 공통 완료 명령을 실행한다.
8. 카드와 대시보드를 review로 바꾸고 구현 커밋을 기록한다.
9. 구현자와 다른 리뷰어가 승인하면 reviewer, review_commit과 done 상태를 같은 커밋에 기록한다.

# 검증

- 증거 유형: RED/GREEN
- 작업 전 필수 행동: 실패 테스트를 먼저 작성한다.
- 작업 전 명령: npm run test -- src/features/posts/content.test.ts src/features/posts/actions.test.ts
- 예상 작업 전 결과: Tiptap JSON 검증과 인증 우선 서버 액션 계약이 없어 실패
- 완료 명령: npm run test -- src/features/posts/content.test.ts src/features/posts/actions.test.ts && npm run typecheck
- 기대 완료 결과: Zod가 허용 노드와 제목·본문 길이를 강제하고, 인증 우선·작성자 고정·소유권·일반 오류 경계가 검증된다.

# 인수 조건

- 허용 노드와 제목·본문 길이가 강제되고 임의 HTML은 거부된다.
- 서버 액션은 입력 파싱보다 인증을 먼저 수행하고 인증 사용자 ID로 작성자를 고정한다.
- 타인 수정과 DB 오류는 안전하게 거부되며 내부 오류를 노출하지 않는다.
- 정상 경로와 거부 경계가 검증된다.
- 비밀 값, 범위 밖 변경과 병렬 소유권 충돌이 없다.
- 카드, 대시보드, 구현 및 리뷰 커밋이 일치한다.

# 리뷰 증거

- RED: 콘텐츠 Zod 스키마와 서버 액션 모듈 부재로 좁은 테스트가 실패했다.
- GREEN: 콘텐츠·액션 15개 테스트가 인증 우선, 작성자 고정, 소유권 조건, 0행·DB/RLS 일반 오류와 제한 Tiptap JSON을 검증하며 통과했다.
- 검증: `npm run lint`, `npm run typecheck`, 전체 unit 133개, E2E 16개, build와 `./scripts/check-harness.sh`가 통과했다. `npm audit --json`은 `nanoid` 3.3.18 잠금 후 취약점 0개였다.
- 구현 커밋: `c29590b` (패키지 보안 `68f2f15`, 액션·Zod `c3a1443` 포함)
- 독립 리뷰: `Codex/p04_t02`가 인증·작성자·소유권·오류·직렬화 경계, Zod 재귀 허용 목록과 패키지·라이선스를 검토해 Critical/Important 없음으로 승인했다.
- 승인 커밋: `863586a` (`리뷰: P05-T01 독립 승인`)

# 커밋

권장 메시지: 기능: Tiptap 제한 편집기와 게시글 CRUD
