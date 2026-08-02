---
id: P06-T01
title: 파일 allowlist·10MB/3개·80/95% 용량 로직
status: review
type: feature
depends_on: ["P02-T03"]
parallel_group: "U-A"
owner: "Codex/p06_t01"
started_at: "2026-08-02T23:54:07+09:00"
blocked_reason: ""
owned_files: ["src/features/attachments/validation.ts", "src/features/attachments/validation.test.ts", "src/features/attachments/quota.ts", "src/features/attachments/quota.test.ts"]
shared_files: []
implementation_commit: "d912340"
reviewer: ""
review_commit: ""
---

# 목표

파일 allowlist·10MB/3개·80/95% 용량 로직을 완료해 다음 의존 작업이 사용할 검증된 산출물을 제공한다.

# 범위

- 생성 또는 수정: src/features/attachments/validation.ts
- 생성 또는 수정: src/features/attachments/validation.test.ts
- 생성 또는 수정: src/features/attachments/quota.ts
- 생성 또는 수정: src/features/attachments/quota.test.ts
- 공유 파일 수정 없음

# 제외

제품 설계의 명시적 제외 기능과 이 카드 뒤 작업의 기능은 추가하지 않는다.

# 선행조건과 차단 해제

P02-T03가 모두 done이면 ready로 전환한다.

# 파일

- src/features/attachments/validation.ts
- src/features/attachments/validation.test.ts
- src/features/attachments/quota.ts
- src/features/attachments/quota.test.ts

# 인터페이스

선행 카드가 제공한 공개 타입과 동작만 소비한다. 이 카드의 파일과 검증 결과가 후속 카드의 계약이다.

# 실행 순서

1. AGENTS.md와 이 카드를 읽고 ready 여부를 확인한 뒤 owner, started_at, status를 갱신한다.
2. 인수 조건을 가장 좁게 증명하는 실패 테스트를 owned_files의 테스트 경로에 먼저 작성한다.
3. 다음 작업 전 검사를 실행한다: npm run test -- src/features/attachments/validation.test.ts src/features/attachments/quota.test.ts
4. 기대 결과를 확인한다: 파일·용량 검증 모듈이 없어 실패.
5. 범위 안의 최소 변경만 구현한다.
6. 다음 통과 검사를 실행한다: npm run test -- src/features/attachments/validation.test.ts src/features/attachments/quota.test.ts
7. ./scripts/check-harness.sh와 사용 가능한 공통 완료 명령을 실행한다.
8. 카드와 대시보드를 review로 바꾸고 구현 커밋을 기록한다.
9. 구현자와 다른 리뷰어가 승인하면 reviewer, review_commit과 done 상태를 같은 커밋에 기록한다.

# 검증

- 증거 유형: RED/GREEN
- 작업 전 필수 행동: 실패 테스트를 먼저 작성한다.
- 작업 전 명령: npm run test -- src/features/attachments/validation.test.ts src/features/attachments/quota.test.ts
- 예상 작업 전 결과: 파일·용량 검증 모듈이 없어 실패
- 완료 명령: npm run test -- src/features/attachments/validation.test.ts src/features/attachments/quota.test.ts
- 기대 완료 결과: allowlist, 위장 MIME, 10MB, 3개, 80%와 95% 경계가 통과한다.

# 인수 조건

- allowlist, 위장 MIME, 10MB, 3개, 80%와 95% 경계가 통과한다.
- 정상 경로와 거부 경계가 검증된다.
- 비밀 값, 범위 밖 변경과 병렬 소유권 충돌이 없다.
- 카드, 대시보드, 구현 및 리뷰 커밋이 일치한다.

# 리뷰 증거

- RED: `npm run test -- src/features/attachments/validation.test.ts src/features/attachments/quota.test.ts`에서 `./validation`, `./quota` 모듈 부재로 2개 suite가 실패했다.
- 리뷰 보강 RED: 소수·unsafe 파일 크기, 소수·unsafe 사용량과 안전 정수 합계 overflow 신규 검사 7개가 기존 구현에서 실패했다.
- GREEN: 대상 2개 파일의 46개 테스트가 통과했다. allowlist와 MIME 조합, 10MiB·3개, 80%·95% 실제 정수 floor/ceil, 경고 재무장·재상승과 차단 후 복구를 검증했다.
- 공통 검사: `./scripts/check-harness.sh`, `npm run lint`, `npm run typecheck`, `npm run test`(49), `npm run test:e2e`(2), `npm run build`, `git diff --check`가 모두 통과했다.
- 구현 커밋: `d912340` (형식 검증 `099d8fa`, 용량 로직 `2ea4563` 포함)
- 독립 리뷰: `Codex/p06_t01_review`가 안전 정수·overflow와 실제 정수 임계값 상태 전이를 재검토해 Critical/Important 없음으로 승인했다.

# 커밋

권장 메시지: 기능: 파일 allowlist·10MB/3개·80/95% 용량 로직
