import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";

async function authenticate(page: import("@playwright/test").Page) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const accessToken = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ aud: "authenticated", exp: now + 3600, role: "authenticated", sub: "10000000-0000-4000-8000-000000000001" })}.mock-signature`;
  const session = { access_token: accessToken, expires_at: now + 3600, expires_in: 3600, refresh_token: "mock-refresh-token", token_type: "bearer", user: { id: "10000000-0000-4000-8000-000000000001" } };
  await page.context().addCookies([{ domain: "127.0.0.1", name: "sb-127-auth-token", path: "/", value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}` }]);
}

for (const viewport of [
  { height: 700, name: "320px", width: 320 },
  { height: 800, name: "375px", width: 375 },
  { height: 900, name: "tablet", width: 768 },
  { height: 900, name: "desktop", width: 1280 },
]) {
  test(`${viewport.name} 공개 홈·로그인 화면은 가로 overflow가 없다`, async ({ page }) => {
    await page.setViewportSize(viewport);

    for (const path of ["/", "/login"] as const) {
      await page.goto(path);
      await expect.poll(() => page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth)).toBe(true);
    }
  });
}

test("768px부터는 데스크톱 메뉴를, 그 아래에서는 모바일 메뉴를 제공한다", async ({ page }) => {
  await page.setViewportSize({ width: 767, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "메뉴 열기" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "주요 메뉴" })).toBeHidden();

  await page.setViewportSize({ width: 768, height: 800 });
  await expect(page.getByRole("navigation", { name: "주요 메뉴" })).toBeVisible();
  await expect(page.getByRole("button", { name: "메뉴 열기" })).toBeHidden();
});

for (const width of [320, 375, 768]) {
  test(`${width}px 실제 강의·상세·게시판·온보딩·관리자 화면은 가로 overflow가 없다`, async ({ page }) => {
    await page.request.get("http://127.0.0.1:54321/__mock?mode=normal");
    await authenticate(page);
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/courses", "/courses/accessible-course", "/board", "/onboarding", "/admin/courses"] as const) {
      await page.goto(path);
      expect(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth)).toBe(true);
    }
  });
}
