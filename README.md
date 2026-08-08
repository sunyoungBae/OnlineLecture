# OnlineLecture

Next.js App Router와 TypeScript로 구축하는 온라인 강의 및 커뮤니티 MVP입니다.

## 개발 명령

```bash
npm install
npx playwright install chromium
npm run dev
```

완료 검사는 다음 명령으로 실행합니다.

CI 또는 Linux 환경에서 Playwright의 시스템 의존성까지 설치해야 하면 `npx playwright install --with-deps chromium`을 사용합니다.

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## 설치 버전과 라이선스

아래 버전은 `package-lock.json`에 고정되어 있으며 각 패키지의 원문 라이선스 고지는 설치된 패키지에 보존됩니다.

| 패키지 | 버전 | 라이선스 |
| --- | --- | --- |
| Next.js | 16.2.12 | MIT |
| React / React DOM | 19.2.8 | MIT |
| TypeScript | 5.9.3 | Apache-2.0 |
| Tailwind CSS / @tailwindcss/postcss | 4.1.18 | MIT |
| PostCSS | 8.5.25 | MIT |
| Vitest | 4.1.10 | MIT |
| Playwright Test | 1.62.1 | Apache-2.0 |
| ESLint | 9.39.5 | MIT |
| @typescript-eslint/parser | 8.65.0 | MIT |
| @types/node | 22.20.1 | MIT |
| @types/react | 19.2.18 | MIT |
| @types/react-dom | 19.2.4 | MIT |
| @base-ui/react | 1.6.0 | MIT |
| @tiptap/react / @tiptap/starter-kit / @tiptap/extension-link | 3.29.2 | MIT |
| Zod | 4.4.3 | MIT |

## MVP 범위

제품 요구사항과 실행 순서는 `docs/superpowers` 아래의 설계 및 계획 문서를 따르며, 작업 상태는 `docs/tasks`의 카드 front matter를 기준으로 관리합니다.
