---
id: P07-T02
title: 키보드·포커스·라벨·44px·WCAG AA·모바일 점검
status: done
type: feature
depends_on: ["P07-T01"]
parallel_group: ""
owner: "Codex/p07_t02"
started_at: "2026-08-08T14:17:55+09:00"
blocked_reason: ""
owned_files: ["tests/e2e/accessibility.spec.ts", "tests/e2e/responsive.spec.ts", "tests/e2e/support/supabase-mock.mjs", "src/app/globals.css", "src/components/ui/button.tsx", "src/components/ui/input.tsx", "src/components/ui/label.tsx", "src/components/ui/textarea.tsx", "src/components/site-header.tsx", "src/components/mobile-menu.tsx", "src/app/(public)/page.tsx", "src/app/(public)/login/page.tsx", "src/app/onboarding/form.tsx", "src/app/courses/page.tsx", "src/app/courses/[slug]/page.tsx", "src/app/board/page.tsx", "src/app/board/[postId]/page.tsx", "src/app/board/new/page.tsx", "src/app/board/[postId]/edit/page.tsx", "src/app/admin/courses/page.tsx", "src/app/admin/courses/[courseId]/lessons/page.tsx", "src/app/admin/storage/page.tsx"]
shared_files: ["playwright.config.ts"]
implementation_commit: "7c7dd3c"
reviewer: "Codex/p04_t02"
review_commit: "90e7869"
---

# 목표

키보드·포커스·라벨·44px·WCAG AA·모바일 점검을 완료해 다음 의존 작업이 사용할 검증된 산출물을 제공한다.

# 범위

- 생성 또는 수정: tests/e2e/accessibility.spec.ts
- 생성 또는 수정: tests/e2e/responsive.spec.ts
- 생성 또는 수정: tests/e2e/support/supabase-mock.mjs
- 통합 소유 시에만 수정: playwright.config.ts
- 이 접근성 통합 카드가 수정: src/app/globals.css
- 이 접근성 통합 카드가 수정: src/components/ui/button.tsx
- 이 접근성 통합 카드가 수정: src/components/ui/input.tsx
- 이 접근성 통합 카드가 수정: src/components/ui/label.tsx
- 이 접근성 통합 카드가 수정: src/components/ui/textarea.tsx
- 이 접근성 통합 카드가 수정: src/components/site-header.tsx
- 이 접근성 통합 카드가 수정: src/components/mobile-menu.tsx
- 이 접근성 통합 카드가 수정: src/app/(public)/page.tsx
- 이 접근성 통합 카드가 수정: src/app/(public)/login/page.tsx
- 이 접근성 통합 카드가 수정: src/app/onboarding/form.tsx
- 이 접근성 통합 카드가 수정: src/app/courses/page.tsx
- 이 접근성 통합 카드가 수정: src/app/courses/[slug]/page.tsx
- 이 접근성 통합 카드가 수정: src/app/board/page.tsx
- 이 접근성 통합 카드가 수정: src/app/board/[postId]/page.tsx
- 이 접근성 통합 카드가 수정: src/app/board/new/page.tsx
- 이 접근성 통합 카드가 수정: src/app/board/[postId]/edit/page.tsx
- 이 접근성 통합 카드가 수정: src/app/admin/courses/page.tsx
- 이 접근성 통합 카드가 수정: src/app/admin/courses/[courseId]/lessons/page.tsx
- 이 접근성 통합 카드가 수정: src/app/admin/storage/page.tsx

# 제외

제품 설계의 명시적 제외 기능과 이 카드 뒤 작업의 기능은 추가하지 않는다.

# 선행조건과 차단 해제

P07-T01가 모두 done이면 ready로 전환한다.

# 파일

- tests/e2e/accessibility.spec.ts
- tests/e2e/responsive.spec.ts
- tests/e2e/support/supabase-mock.mjs
- playwright.config.ts
- src/app/globals.css
- src/components/ui/button.tsx
- src/components/ui/input.tsx
- src/components/ui/label.tsx
- src/components/ui/textarea.tsx
- src/components/site-header.tsx
- src/components/mobile-menu.tsx
- src/app/(public)/page.tsx
- src/app/(public)/login/page.tsx
- src/app/onboarding/form.tsx
- src/app/courses/page.tsx
- src/app/courses/[slug]/page.tsx
- src/app/board/page.tsx
- src/app/board/[postId]/page.tsx
- src/app/board/new/page.tsx
- src/app/board/[postId]/edit/page.tsx
- src/app/admin/courses/page.tsx
- src/app/admin/courses/[courseId]/lessons/page.tsx
- src/app/admin/storage/page.tsx

# 인터페이스

선행 카드가 제공한 공개 타입과 동작만 소비한다. 이 카드의 파일과 검증 결과가 후속 카드의 계약이다.

# 실행 순서

1. AGENTS.md와 이 카드를 읽고 ready 여부를 확인한 뒤 owner, started_at, status를 갱신한다.
2. 인수 조건을 가장 좁게 증명하는 실패 테스트를 owned_files의 테스트 경로에 먼저 작성한다.
3. 다음 작업 전 검사를 실행한다: npm run test:e2e -- tests/e2e/accessibility.spec.ts tests/e2e/responsive.spec.ts
4. 기대 결과를 확인한다: 접근성·반응형 위반으로 실패.
5. 범위 안의 최소 변경만 구현한다.
6. 다음 통과 검사를 실행한다: npm run test:e2e -- tests/e2e/accessibility.spec.ts tests/e2e/responsive.spec.ts
7. ./scripts/check-harness.sh와 사용 가능한 공통 완료 명령을 실행한다.
8. 카드와 대시보드를 review로 바꾸고 구현 커밋을 기록한다.
9. 구현자와 다른 리뷰어가 승인하면 reviewer, review_commit과 done 상태를 같은 커밋에 기록한다.

# 검증

- 증거 유형: RED/GREEN
- 작업 전 필수 행동: 실패 테스트를 먼저 작성한다.
- 작업 전 명령: npm run test:e2e -- tests/e2e/accessibility.spec.ts tests/e2e/responsive.spec.ts
- 예상 작업 전 결과: 접근성·반응형 위반으로 실패
- 완료 명령: npm run test:e2e -- tests/e2e/accessibility.spec.ts tests/e2e/responsive.spec.ts
- 기대 완료 결과: 키보드·포커스·라벨·44px·WCAG AA·모바일 메뉴가 통과한다.

# 인수 조건

- 키보드·포커스·라벨·44px·WCAG AA·모바일 메뉴가 통과한다.
- 정상 경로와 거부 경계가 검증된다.
- 비밀 값, 범위 밖 변경과 병렬 소유권 충돌이 없다.
- 카드, 대시보드, 구현 및 리뷰 커밋이 일치한다.

# 리뷰 증거

- RED: 데스크톱 헤더 링크가 36.9px로 44px 미만이었고, 실제 경로 E2E 14개 중 정상 상세·관리자·빈·오류·거부 5개가 실패했다. `tabIndex=-1` 변이에서도 실제 Tab 계약이 해당 컨트롤에서 실패했다.
- GREEN: 접근성 E2E 14개가 실제 강의·게시판·온보딩·관리자 정상·빈·오류·거부 렌더에서 모든 활성 컨트롤의 Tab 순서·포커스 링·이름·44px, 유효 배경 대비와 320/375/768 overflow를 검증하며 통과했다.
- 검증: localhost 전용 Supabase mock과 SSR 세션을 1 worker로 결정적으로 실행했고, 전체 E2E 30개, unit 218개, lint, typecheck, production build, `./scripts/check-harness.sh`와 audit 0건이 최신 HEAD에서 통과했다.
- 구현 커밋: `7c7dd3c` (기본 접근성 `1a5f689`, mock 연결 `6c578bf`, 전체 경로 강화 `fa24033` 포함)
- 독립 리뷰: `Codex/p04_t02`가 실제 Tab 도달성, 상태별 SSR 렌더, 이름·터치 영역·대비·반응형, mock 격리와 회차 hidden 입력 계약을 검토해 Critical/Important 없음으로 승인했다.
- 승인 커밋: `90e7869` (`리뷰: P07-T02 독립 승인`)

# 커밋

권장 메시지: 기능: 키보드·포커스·라벨·44px·WCAG AA·모바일 점검
