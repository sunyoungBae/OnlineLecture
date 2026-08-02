---
id: P08-T01
title: lint·typecheck·unit·E2E·build 전체 통과
status: blocked
type: config
depends_on: ["P07-T02"]
parallel_group: ""
owner: ""
started_at: ""
blocked_reason: dependency
owned_files: ["docs/verification/release-check.md"]
shared_files: []
reviewer: ""
review_commit: ""
---

# 목표

lint·typecheck·unit·E2E·build 전체 통과을 완료해 다음 의존 작업이 사용할 검증된 산출물을 제공한다.

# 범위

- 생성 또는 수정: docs/verification/release-check.md
- 제품 결함이 발견되면 이 카드에서 범위를 넓혀 수정하지 않고, 정확한 파일 소유권을 가진 결함 카드를 먼저 추가한다.

# 제외

제품 설계의 명시적 제외 기능과 이 카드 뒤 작업의 기능은 추가하지 않는다.

# 선행조건과 차단 해제

P07-T02가 모두 done이면 ready로 전환한다.

# 파일

- docs/verification/release-check.md

# 인터페이스

선행 카드가 제공한 공개 타입과 동작만 소비한다. 이 카드의 파일과 검증 결과가 후속 카드의 계약이다.

# 실행 순서

1. AGENTS.md와 이 카드를 읽고 ready 여부를 확인한 뒤 owner, started_at, status를 갱신한다.
2. 다음 작업 전 검사를 실행한다: npm run lint && npm run typecheck && npm run test && npm run test:e2e && npm run build
3. 기대 결과를 확인한다: 남은 결함이 있으면 하나 이상의 명령이 실패.
4. 범위 안의 최소 변경만 구현한다.
5. 다음 통과 검사를 실행한다: npm run lint && npm run typecheck && npm run test && npm run test:e2e && npm run build
6. ./scripts/check-harness.sh와 사용 가능한 공통 완료 명령을 실행한다.
7. 카드와 대시보드를 review로 바꾸고 구현 커밋을 기록한다.
8. 구현자와 다른 리뷰어가 승인하면 reviewer, review_commit과 done 상태를 같은 커밋에 기록한다.

# 검증

- 증거 유형: 구조/명령
- 작업 전 명령: npm run lint && npm run typecheck && npm run test && npm run test:e2e && npm run build
- 예상 작업 전 결과: 남은 결함이 있으면 하나 이상의 명령이 실패
- 완료 명령: npm run lint && npm run typecheck && npm run test && npm run test:e2e && npm run build
- 기대 완료 결과: 다섯 명령의 종료 코드 0과 실행 시각이 기록된다.

# 인수 조건

- 다섯 명령의 종료 코드 0과 실행 시각이 기록된다.
- 정상 경로와 거부 경계가 검증된다.
- 비밀 값, 범위 밖 변경과 병렬 소유권 충돌이 없다.
- 카드, 대시보드, 구현 및 리뷰 커밋이 일치한다.

# 리뷰 증거

작업 전 실패, 완료 명령 결과, 구현 커밋, 구현자와 다른 리뷰어, 승인 커밋을 이 절에 기록한다.

# 커밋

권장 메시지: 설정: lint·typecheck·unit·E2E·build 전체 통과
