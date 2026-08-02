# MVP 작업 진행 대시보드

카드 front matter가 상태의 원본이다. 상태를 바꾸는 커밋에서 이 표도 함께 갱신한다. 작업 규칙은 작업 카드 작성 규칙과 MVP 마스터 실행계획을 따른다.

## 상태

- blocked: 의존 작업, 외부 준비 또는 결정 대기
- ready: 즉시 담당 가능
- in_progress: 담당자 작업 중
- review: 구현 검증 완료, 독립 리뷰 대기
- done: 독립 리뷰와 승인 커밋 완료

## 단계별 진행

| 단계 | 완료/전체 |
| --- | --- |
| P00 하네스 | 5/5 |
| P01 기반 | 2/3 |
| P02 데이터 | 0/3 |
| P03 신원 | 0/3 |
| P04 강의 | 0/3 |
| P05 커뮤니티 | 0/3 |
| P06 파일 | 0/4 |
| P07 마감 | 0/2 |
| P08 출시 | 0/3 |
| P09 수동 인수 | 0/2 |
| 전체 | 7/31 |

## 전체 작업

| ID | 작업 | 상태 | 병렬 그룹 |
| --- | --- | --- | --- |
| P00-T01 | 카드 스키마와 상태 규칙 | done | H-A |
| P00-T02 | 공통 작업·비밀·MCP 규칙 | done | H-A |
| P00-T03 | MVP 의존성과 추적성 | done | - |
| P00-T04 | 31개 작업 카드와 대시보드 | done | - |
| P00-T05 | 하네스 자동 검사 | done | - |
| P01-T01 | Next.js·TypeScript·Tailwind·Vitest·Playwright 기반 | done | - |
| P01-T02 | Sera 기반 토큰·폰트·필수 UI | done | F-A |
| P01-T03 | 공개 헤더·모바일 메뉴·홈·오류 틀 | review | F-A |
| P02-T01 | 테이블·제약·인덱스 migration | ready | D-A |
| P02-T02 | 역할별 RLS와 SQL 권한 테스트 | blocked | - |
| P02-T03 | 비공개 Storage 정책과 DB 생성 타입 | blocked | - |
| P03-T01 | Google OAuth·콜백·세션 경계 | blocked | - |
| P03-T02 | 별명 검증·중복 차단·온보딩 | blocked | - |
| P03-T03 | 보호 경로·역할 가드·관리자 승격 절차 | blocked | - |
| P04-T01 | 회원 강의 목록·상세·YouTube 플레이어 | blocked | C-A |
| P04-T02 | 운영자 강의 CRUD | blocked | C-A |
| P04-T03 | 운영자 회차 CRUD·위아래 순서 이동 | blocked | - |
| P05-T01 | Tiptap 제한 편집기와 게시글 CRUD | blocked | B-A |
| P05-T02 | 공개 목록·escaped ILIKE 검색·필터·페이지네이션 | blocked | - |
| P05-T03 | 댓글 CRUD·공지·운영자 삭제 | blocked | - |
| P06-T01 | 파일 allowlist·10MB/3개·80/95% 용량 로직 | blocked | U-A |
| P06-T02 | 게시글 첨부 업로드·서명 다운로드·정리 | blocked | U-B |
| P06-T03 | 회차 자료 업로드·다운로드·삭제 | blocked | U-B |
| P06-T04 | 80% Resend 1회·재무장·95% 차단/복구 | blocked | - |
| P07-T01 | 오류·404·권한·빈 상태·로딩 공통 마감 | blocked | Q-A |
| P07-T02 | 키보드·포커스·라벨·44px·WCAG AA·모바일 점검 | blocked | - |
| P08-T01 | lint·typecheck·unit·E2E·build 전체 통과 | blocked | - |
| P08-T02 | 공개 읽기 30개 동시 요청 부하 스모크 | blocked | R-A |
| P08-T03 | GitHub·Vercel 연결과 배포 문서 | blocked | R-A |
| P09-T01 | 배포 Google OAuth·별명·강의·YouTube 수동 인수 | blocked | M-A |
| P09-T02 | Resend 경고 도착·Supabase Advisor 수동 인수 | blocked | M-A |

## 현재 흐름

- 진행 중: 없음
- 리뷰 대기: P01-T03 공개 헤더·모바일 메뉴·홈·오류 틀
- 다음 실행 가능: P02-T01 테이블·제약·인덱스 migration (Supabase 개발 프로젝트 체크포인트 대기)
- 향후 외부 차단: OAuth, YouTube, Resend, Supabase, GitHub와 Vercel 체크포인트는 각 카드의 선행 작업 완료 후 외부 준비를 확인해 해제

## 상태 변경 체크

1. 카드의 의존성과 파일 소유권을 확인한다.
2. 카드 front matter와 이 표를 같은 커밋에서 갱신한다.
3. `./scripts/check-harness.sh`를 실행한다.
4. 구현자와 다른 리뷰어가 승인한 커밋만 done으로 표시한다.
