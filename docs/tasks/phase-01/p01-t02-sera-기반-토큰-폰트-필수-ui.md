---
id: P01-T02
title: Sera 기반 토큰·폰트·필수 UI
status: done
type: feature
depends_on: ["P01-T01"]
parallel_group: "F-A"
owner: "Codex/p01_t02"
started_at: "2026-08-02T14:34:25+09:00"
blocked_reason: ""
owned_files: ["src/app/globals.css", "src/lib/design-tokens.ts", "src/lib/design-tokens.test.ts", "src/components/ui", "package.json", "package-lock.json", "README.md"]
shared_files: []
implementation_commit: "4527b02"
reviewer: "Codex/p01_t02_review"
review_commit: "83030c4"
---

# 목표

Sera 기반 토큰·폰트·필수 UI을 완료해 다음 의존 작업이 사용할 검증된 산출물을 제공한다.

# 범위

- 생성 또는 수정: src/app/globals.css
- 생성 또는 수정: src/lib/design-tokens.ts
- 생성 또는 수정: src/lib/design-tokens.test.ts
- 생성 또는 수정: src/components/ui
- 생성 또는 수정: package.json
- 생성 또는 수정: package-lock.json
- 생성 또는 수정: README.md (추가 UI 패키지의 정확 버전과 라이선스)

# 제외

제품 설계의 명시적 제외 기능과 이 카드 뒤 작업의 기능은 추가하지 않는다.

# 선행조건과 차단 해제

P01-T01가 모두 done이면 ready로 전환한다.

# 파일

- src/app/globals.css
- src/lib/design-tokens.ts
- src/lib/design-tokens.test.ts
- src/components/ui
- package.json
- package-lock.json
- README.md

# 인터페이스

선행 카드가 제공한 공개 타입과 동작만 소비한다. 이 카드의 파일과 검증 결과가 후속 카드의 계약이다.

# 실행 순서

1. AGENTS.md와 이 카드를 읽고 ready 여부를 확인한 뒤 owner, started_at, status를 갱신한다.
2. 인수 조건을 가장 좁게 증명하는 실패 테스트를 owned_files의 테스트 경로에 먼저 작성한다.
3. 다음 작업 전 검사를 실행한다: npm run test -- src/lib/design-tokens.test.ts
4. 기대 결과를 확인한다: 토큰 모듈이 없어 실패.
5. 범위 안의 최소 변경만 구현한다.
6. 다음 통과 검사를 실행한다: npm run test -- src/lib/design-tokens.test.ts && npm run typecheck
7. ./scripts/check-harness.sh와 사용 가능한 공통 완료 명령을 실행한다.
8. 카드와 대시보드를 review로 바꾸고 구현 커밋을 기록한다.
9. 구현자와 다른 리뷰어가 승인하면 reviewer, review_commit과 done 상태를 같은 커밋에 기록한다.

# 검증

- 증거 유형: RED/GREEN
- 작업 전 필수 행동: 실패 테스트를 먼저 작성한다.
- 작업 전 명령: npm run test -- src/lib/design-tokens.test.ts
- 예상 작업 전 결과: 토큰 모듈이 없어 실패
- 완료 명령: npm run test -- src/lib/design-tokens.test.ts && npm run typecheck
- 기대 완료 결과: 지정 색상·폭·간격·2px 모서리와 글꼴 계약이 통과한다.

# 인수 조건

- 지정 색상·폭·간격·2px 모서리와 글꼴 계약이 통과한다.
- 정상 경로와 거부 경계가 검증된다.
- 비밀 값, 범위 밖 변경과 병렬 소유권 충돌이 없다.
- 카드, 대시보드, 구현 및 리뷰 커밋이 일치한다.

# 리뷰 증거

작업 전 실패, 완료 명령 결과, 구현 커밋, 구현자와 다른 리뷰어, 승인 커밋을 이 절에 기록한다.

- RED 1: `npm run test -- src/lib/design-tokens.test.ts` → `Cannot find module './design-tokens'`로 1개 suite 실패. 토큰 모듈 부재라는 예상 이유를 확인했다.
- GREEN 1: 같은 명령 → 1개 파일, 2개 테스트 통과. 지정 토큰과 알 수 없는 경로 거부를 확인했다.
- 최초 구현 커밋: `4f4054e` (`기능: Sera 기반 토큰·폰트·필수 UI`).
- RED 2: CSS/UI 산출물 계약 테스트를 추가한 뒤 기존 Button에 `@base-ui/react/button` import가 없어 3개 중 1개 테스트가 예상대로 실패했다.
- GREEN 2: Base UI 1.6.0 기반 Button·Input·Textarea·Label과 44px Label을 구현한 뒤 같은 테스트 3개가 모두 통과했다.
- 최종 구현 커밋: `4527b02` (`수정: Base UI 프리미티브와 접근성 계약 보완`).
- 완료 검증: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build`, `./scripts/check-harness.sh`가 통합 상태에서 통과했다. 단위 3개, E2E 2개가 통과했고 하네스는 31개 카드를 확인했다.
- 독립 재검토: `Codex/p01_t02_review`가 Base UI 직접 기반, CSS/UI 계약, 44px Label, Noto 변수 연결, 버전·라이선스·소유권을 확인해 Critical/Important 잔여 없음으로 승인했다.
- 승인 커밋: `83030c4` (`리뷰: P01-T02 독립 승인`).

# 커밋

권장 메시지: 기능: Sera 기반 토큰·폰트·필수 UI
