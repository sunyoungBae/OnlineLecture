import { expect, test } from "@playwright/test";

test.use({ baseURL: "http://localhost:3000" });

test("홈에서 로그인 CTA로 로그인 화면에 이동한다", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("banner")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "온라인 강의" }),
  ).toBeVisible();

  const loginCallToAction = page.getByRole("link", {
    name: "Google로 로그인",
  });
  await expect(loginCallToAction).toHaveAttribute("href", "/login");

  const box = await loginCallToAction.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);

  await loginCallToAction.click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "로그인" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Google로 계속하기" }),
  ).toBeVisible();
});

test("모바일 메뉴를 키보드로 열고 Escape로 닫는다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const menuButton = page.getByRole("button", { name: "메뉴 열기" });
  const buttonBox = await menuButton.boundingBox();
  expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
  expect(buttonBox?.height).toBeGreaterThanOrEqual(44);

  await menuButton.focus();
  await expect(menuButton).toBeFocused();
  await menuButton.press("Enter");

  const mobileNavigation = page.getByRole("navigation", {
    name: "모바일 메뉴",
  });
  await expect(mobileNavigation).toBeVisible();
  await expect(
    mobileNavigation.getByRole("link", { name: "로그인" }),
  ).toBeVisible();

  await page.keyboard.press("Tab");
  await expect(
    mobileNavigation.getByRole("link", { name: "홈" }),
  ).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(mobileNavigation).toBeHidden();
  await expect(menuButton).toBeFocused();
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
});
