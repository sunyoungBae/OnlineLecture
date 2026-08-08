import { expect, test } from "@playwright/test";

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
