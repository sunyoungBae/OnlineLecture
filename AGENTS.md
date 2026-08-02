# OnlineLecture 작업 규칙

## 기준 문서

- 제품 요구사항: `docs/superpowers/specs/2026-08-02-online-lecture-design.md`
- 작업 하네스: `docs/superpowers/specs/2026-08-02-development-harness-design.md`
- 실행 순서: `docs/superpowers/plans/2026-08-02-online-lecture-mvp.md`
- 작업 상태의 원본: `docs/tasks/phase-*/*.md`의 front matter
- 범위를 바꿀 때 설계, 마스터 계획, 작업 카드 순으로 갱신한다.

## 작업 시작과 상태

- `docs/tasks/CONTRIBUTING.md`를 먼저 읽는다.
- 선행 작업이 모두 `done`인 `ready` 카드만 시작한다.
- 시작할 때 카드를 `in_progress`로 바꾸고 `owner`, `started_at`을 기록한다.
- 병렬 작업은 `owned_files`가 겹치지 않을 때만 진행한다. `shared_files`는 지정된 통합 작업자만 수정한다.
- 카드 상태와 `docs/tasks/README.md` 대시보드는 같은 커밋에서 갱신한다.

## 공통 명령

P01-T01 프로젝트 기반 작업 전에는 카드별 문서 검증만 실행한다. P01-T01이 실제 npm 스크립트를 만들면 아래 명령이 필수 완료 검사다.

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

하네스 문서를 변경하면 `./scripts/check-harness.sh`도 실행한다.

## 테스트 원칙

- `feature`와 동작을 포함한 `migration`은 실패 테스트를 먼저 작성하고 예상한 이유로 실패하는지 확인한다.
- 최소 구현으로 같은 테스트를 통과시킨 뒤 관련 테스트와 공통 완료 검사를 실행한다.
- `docs`, `config`, `manual-checkpoint`는 `docs/tasks/CONTRIBUTING.md`의 유형별 증거를 남긴다.
- 테스트를 나중에 끼워 맞추거나 실패 확인을 생략하지 않는다.

## 데이터베이스와 권한

- DB 변경은 새 파일을 `supabase/migrations`에 추가해서만 수행한다. 이미 적용된 migration은 수정하지 않는다.
- 권한은 애플리케이션 조건문뿐 아니라 RLS와 Storage 정책으로 강제한다.
- 비회원, 회원, 작성자, 운영자 역할별 허용·거부 테스트를 남긴다.
- 브라우저 코드에서 service role 키를 읽거나 전달하지 않는다.

## 디자인과 접근성

- 제품 설계의 색상, 최대 폭, 4px 간격, 2px 모서리 토큰을 지킨다.
- 제목은 Noto Serif KR, 본문과 컨트롤은 Noto Sans KR를 사용한다.
- 모든 컨트롤은 키보드 조작, 보이는 포커스, 명시적 라벨, 최소 44px 터치 영역과 WCAG AA 대비를 갖춘다.
- 공식 shadcn 레지스트리의 명시된 컴포넌트만 추가한다. 다크 모드, 과한 그림자, 그라데이션과 카드 중첩은 만들지 않는다.

## 비밀과 외부 서비스

- 실제 키, 프로젝트 ID, 사용자 데이터, 서명 URL과 `.env*` 실값을 커밋하지 않는다.
- 브라우저 공개 값 외의 Supabase service role 및 Resend 키는 서버에서만 사용한다.
- Supabase MCP는 개발 프로젝트 하나에 읽기 전용으로 연결한다. DB 변경은 migration으로 리뷰한다.
- Google OAuth 승인, 실제 이메일 도착과 배포 환경 검증은 수동 체크포인트에 증거를 남긴다.

## 변경과 커밋

- 사용자나 다른 작업자의 관련 없는 변경을 되돌리거나 포맷하지 않는다.
- 카드의 정확한 파일 범위를 지킨다. 새 경로가 필요하면 카드 갱신과 구현을 분리 커밋할 수 있다.
- 실패 테스트 확인, 최소 구현, 통과 확인이 끝난 작은 논리 단위마다 커밋한다.
- 커밋 메시지와 사용자에게 보이는 작업 보고는 한글로 작성한다.
- `review`에는 구현 커밋을, `done`에는 구현자와 다른 리뷰어 및 승인 커밋을 기록한다.

## 완료 조건

- 카드의 검증 및 인수 조건을 모두 충족한다.
- 관련 좁은 검사와 사용 가능한 공통 완료 명령이 깨끗하게 통과한다.
- 카드와 대시보드 상태, 리뷰 증거, 커밋 경계가 실제 결과와 일치한다.
- 비밀 값과 범위 밖 변경이 diff에 없는지 확인한다.
