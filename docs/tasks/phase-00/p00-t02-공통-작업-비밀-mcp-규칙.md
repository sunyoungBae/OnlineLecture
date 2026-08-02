---
id: P00-T02
title: 공통 작업·비밀·MCP 규칙
status: done
type: config
depends_on: []
parallel_group: "H-A"
owner: "Codex"
started_at: "2026-08-02T00:00:00+09:00"
blocked_reason: ""
owned_files: ["AGENTS.md", ".env.example", ".codex/config.toml.example"]
shared_files: []
reviewer: "검토 에이전트"
review_commit: "62f940f"
---

# 목표

공통 작업·비밀·MCP 규칙을 완료해 다음 의존 작업이 사용할 검증된 산출물을 제공한다.

# 범위

- 생성 또는 수정: AGENTS.md
- 생성 또는 수정: .env.example
- 생성 또는 수정: .codex/config.toml.example
- 공유 파일 수정 없음

# 제외

제품 설계의 명시적 제외 기능과 이 카드 뒤 작업의 기능은 추가하지 않는다.

# 선행조건과 차단 해제

추가 선행 작업이 없다.

# 파일

- AGENTS.md
- .env.example
- .codex/config.toml.example

# 인터페이스

선행 카드가 제공한 공개 타입과 동작만 소비한다. 이 카드의 파일과 검증 결과가 후속 카드의 계약이다.

# 실행 순서

1. AGENTS.md와 이 카드를 읽고 ready 여부를 확인한 뒤 owner, started_at, status를 갱신한다.
2. 다음 작업 전 검사를 실행한다: test -f AGENTS.md
3. 기대 결과를 확인한다: 공통 규칙 파일이 없어서 실패.
4. 범위 안의 최소 변경만 구현한다.
5. 다음 통과 검사를 실행한다: awk -F= '/^[A-Z0-9_]+=/{if ($2 != "") exit 1}' .env.example
6. ./scripts/check-harness.sh와 사용 가능한 공통 완료 명령을 실행한다.
7. 카드와 대시보드를 review로 바꾸고 구현 커밋을 기록한다.
8. 구현자와 다른 리뷰어가 승인하면 reviewer, review_commit과 done 상태를 같은 커밋에 기록한다.

# 검증

- 증거 유형: 구조/명령
- 작업 전 명령: test -f AGENTS.md
- 예상 작업 전 결과: 공통 규칙 파일이 없어서 실패
- 완료 명령: awk -F= '/^[A-Z0-9_]+=/{if ($2 != "") exit 1}' .env.example
- 기대 완료 결과: 환경 변수 값이 모두 비어 있고 규칙 문서가 존재한다.

# 인수 조건

- 환경 변수 값이 모두 비어 있고 규칙 문서가 존재한다.
- 정상 경로와 거부 경계가 검증된다.
- 비밀 값, 범위 밖 변경과 병렬 소유권 충돌이 없다.
- 카드, 대시보드, 구현 및 리뷰 커밋이 일치한다.

# 리뷰 증거

작업 전 실패, 완료 명령 결과, 구현 커밋, 구현자와 다른 리뷰어, 승인 커밋을 이 절에 기록한다.

# 커밋

권장 메시지: 설정: 공통 작업·비밀·MCP 규칙
