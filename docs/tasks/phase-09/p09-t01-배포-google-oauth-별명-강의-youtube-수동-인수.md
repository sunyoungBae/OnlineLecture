---
id: P09-T01
title: 배포 Google OAuth·별명·강의·YouTube 수동 인수
status: blocked
type: manual-checkpoint
depends_on: ["P08-T03"]
parallel_group: "M-A"
owner: ""
started_at: ""
blocked_reason: dependency
owned_files: ["docs/acceptance/oauth-video.md"]
shared_files: []
implementation_commit: ""
reviewer: ""
review_commit: ""
---

# 목표

배포 Google OAuth·별명·강의·YouTube 수동 인수을 완료해 다음 의존 작업이 사용할 검증된 산출물을 제공한다.

# 범위

- 생성 또는 수정: docs/acceptance/oauth-video.md
- Google OAuth와 YouTube는 외부 검증 대상이며 저장소 파일이 아니다.

# 제외

제품 설계의 명시적 제외 기능과 이 카드 뒤 작업의 기능은 추가하지 않는다.

# 선행조건과 차단 해제

P08-T03가 done이면 `blocked_reason: external`로 바꾸고 Google Cloud OAuth 웹 앱·기본 신원 범위·Supabase Google Provider·배포 리디렉션 URL·공개 테스트 영상 준비를 확인한 뒤 ready로 전환한다.

# 파일

- docs/acceptance/oauth-video.md

# 인터페이스

선행 카드가 제공한 공개 타입과 동작만 소비한다. 이 카드의 파일과 검증 결과가 후속 카드의 계약이다.

# 실행 순서

1. AGENTS.md와 이 카드를 읽고 ready 여부를 확인한 뒤 owner, started_at, status를 갱신한다.
2. 다음 작업 전 검사를 실행한다: test -s docs/acceptance/oauth-video.md
3. 기대 결과를 확인한다: 배포 수동 증거가 없어 실패.
4. 범위 안의 최소 변경만 구현한다.
5. 다음 통과 검사를 실행한다: test -s docs/acceptance/oauth-video.md
6. ./scripts/check-harness.sh와 사용 가능한 공통 완료 명령을 실행한다.
7. 카드와 대시보드를 review로 바꾸고 구현 커밋을 기록한다.
8. 구현자와 다른 리뷰어가 승인하면 reviewer, review_commit과 done 상태를 같은 커밋에 기록한다.

# 검증

- 증거 유형: 수동 승인
- 작업 전 명령: test -s docs/acceptance/oauth-video.md
- 예상 작업 전 결과: 배포 수동 증거가 없어 실패
- 완료 명령: test -s docs/acceptance/oauth-video.md && rg -q '환경|수행 시각|승인자|Google OAuth|별명|YouTube|공개 영상 한계' docs/acceptance/oauth-video.md
- 기대 완료 결과: 배포 URL, 환경, 시각, 승인자와 로그인→별명→영상 재생 결과가 기록된다.

# 인수 조건

- 배포 URL, 환경, 시각, 승인자와 로그인→별명→영상 재생 결과가 기록된다.
- 정상 경로와 거부 경계가 검증된다.
- 비밀 값, 범위 밖 변경과 병렬 소유권 충돌이 없다.
- 카드, 대시보드, 구현 및 리뷰 커밋이 일치한다.

# 리뷰 증거

작업 전 실패, 완료 명령 결과, 구현 커밋, 구현자와 다른 리뷰어, 승인 커밋을 이 절에 기록한다.

# 커밋

권장 메시지: 검증: 배포 Google OAuth·별명·강의·YouTube 수동 인수
