---
id: P01-T01
title: Next.js·TypeScript·Tailwind·Vitest·Playwright 기반
status: review
type: config
depends_on: ["P00-T05"]
parallel_group: ""
owner: "Codex"
started_at: "2026-08-02T14:06:38+09:00"
blocked_reason: ""
owned_files: ["package.json", "next.config.ts", "tsconfig.json", "vitest.config.ts", "playwright.config.ts", "postcss.config.mjs", ".gitignore", "next-env.d.ts", "src/app/globals.css", "src/app/layout.tsx", "src/app/page.tsx", "README.md"]
shared_files: ["package-lock.json"]
implementation_commit: "2535dde"
reviewer: ""
review_commit: ""
---

# 목표

Next.js·TypeScript·Tailwind·Vitest·Playwright 기반을 완료해 다음 의존 작업이 사용할 검증된 산출물을 제공한다.

# 범위

- 생성 또는 수정: package.json
- 생성 또는 수정: next.config.ts
- 생성 또는 수정: tsconfig.json
- 생성 또는 수정: vitest.config.ts
- 생성 또는 수정: playwright.config.ts
- 생성 또는 수정: postcss.config.mjs
- 생성 또는 수정: .gitignore
- 생성 또는 수정: next-env.d.ts
- 생성 또는 수정: src/app/globals.css
- 생성 또는 수정: src/app/layout.tsx
- 생성 또는 수정: src/app/page.tsx
- 생성 또는 수정: README.md
- 통합 소유 시에만 수정: package-lock.json

# 제외

제품 설계의 명시적 제외 기능과 이 카드 뒤 작업의 기능은 추가하지 않는다.

# 선행조건과 차단 해제

P00-T05가 모두 done이면 ready로 전환한다.

# 파일

- package.json
- next.config.ts
- tsconfig.json
- vitest.config.ts
- playwright.config.ts
- postcss.config.mjs
- .gitignore
- next-env.d.ts
- src/app/globals.css
- src/app/layout.tsx
- src/app/page.tsx
- README.md
- package-lock.json

# 인터페이스

선행 카드가 제공한 공개 타입과 동작만 소비한다. 이 카드의 파일과 검증 결과가 후속 카드의 계약이다.

# 실행 순서

1. AGENTS.md와 이 카드를 읽고 ready 여부를 확인한 뒤 owner, started_at, status를 갱신한다.
2. 다음 작업 전 검사를 실행한다: npm run typecheck
3. 기대 결과를 확인한다: package.json 또는 스크립트가 없어 실패.
4. 범위 안의 최소 변경만 구현한다.
5. 다음 통과 검사를 실행한다: npm run lint && npm run typecheck && npm run test && npm run test:e2e && npm run build
6. ./scripts/check-harness.sh와 사용 가능한 공통 완료 명령을 실행한다.
7. 카드와 대시보드를 review로 바꾸고 구현 커밋을 기록한다.
8. 구현자와 다른 리뷰어가 승인하면 reviewer, review_commit과 done 상태를 같은 커밋에 기록한다.

# 검증

- 증거 유형: 구조/명령
- 작업 전 명령: npm run typecheck
- 예상 작업 전 결과: package.json 또는 스크립트가 없어 실패
- 완료 명령: npm run lint && npm run typecheck && npm run test && npm run test:e2e && npm run build
- 기대 완료 결과: 다섯 완료 명령이 빈 애플리케이션에서 성공한다.

# 인수 조건

- 다섯 완료 명령이 빈 애플리케이션에서 성공한다.
- 정상 경로와 거부 경계가 검증된다.
- 비밀 값, 범위 밖 변경과 병렬 소유권 충돌이 없다.
- 카드, 대시보드, 구현 및 리뷰 커밋이 일치한다.

# 리뷰 증거

작업 전 실패, 완료 명령 결과, 구현 커밋, 구현자와 다른 리뷰어, 승인 커밋을 이 절에 기록한다.

- 작업 전 RED (2026-08-02T14:07:08+09:00): `npm run typecheck` → 종료 코드 254. `package.json`을 찾을 수 없다는 `ENOENT`로 예상대로 실패했다.
- 완료 GREEN (2026-08-02T14:17:00+09:00): `npm run lint && npm run typecheck && npm run test && npm run test:e2e && npm run build` → 종료 코드 0. Vitest와 Playwright는 빈 suite를 정상 경계로 처리했고 Next.js production build는 `/`와 `/_not-found`를 정적 생성했다.
- 하네스 (2026-08-02T14:17:00+09:00): `./scripts/check-harness.sh` → `하네스 검사 통과: 31개 작업 카드`.
- 최초 구현 커밋: `792cfac` (`설정: Next.js·TypeScript·Tailwind·Vitest·Playwright 기반`).
- 범위 보정 커밋: `646aaf7` (`문서: P01-T01 Tailwind 기반 소유권 보완`).
- 최종 구현 커밋: `2535dde` (`수정: P01-T01 독립 리뷰 반영`). Tailwind PostCSS·전역 CSS 연결, Playwright 설치 안내, 생성물 제외, lint 범위, 안전한 PostCSS·Sharp override를 반영했다.
- 독립 재검토 (2026-08-02T14:34:00+09:00): 최초 코드·설정 지적 5건 해소 확인. `npm ls postcss sharp`, `npm audit --omit=dev --audit-level=high`, 다섯 완료 명령, 하네스 검사가 모두 통과했다.

# 커밋

권장 메시지: 설정: Next.js·TypeScript·Tailwind·Vitest·Playwright 기반
