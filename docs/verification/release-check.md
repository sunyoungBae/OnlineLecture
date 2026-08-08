# 출시 검증 기록

검증 시작: 2026-08-08T20:00:59+09:00
기준 커밋: `26271c7`

최신 HEAD에서 아래 명령을 fresh 실행했다. 실제 비밀값은 기록하지 않았다.

| 검사 | 결과 |
| --- | --- |
| `./scripts/check-harness.sh` | 종료 코드 0, 작업 카드 31개 통과 |
| `npm run lint` | 종료 코드 0 |
| `npm run typecheck` | 종료 코드 0 |
| `npm run test` | 종료 코드 0, 파일 27개·테스트 218개 통과 |
| `npm run test:e2e` | 종료 코드 0, 테스트 30개 통과 |
| `npm run build` | 종료 코드 0 |
| `npm audit --audit-level=high` | 종료 코드 0, 취약점 0개 |
| `git diff --check` | 종료 코드 0 |
| `git status --short` | 출력 없음(깨끗한 작업 트리) |

비밀 패턴 스캔은 변수명·가짜 테스트 값을 제외하고 실제 키, 서명 URL, 사용자 데이터를 찾지 못했다. 실제 값은 문서에도 기록하지 않았다.
