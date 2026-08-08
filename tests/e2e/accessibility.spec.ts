import { expect, test } from "@playwright/test";

type Rgb = [number, number, number];

function luminance([red, green, blue]: Rgb) {
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function contrastRatio(foreground: Rgb, background: Rgb) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((left, right) => right - left);
  return (lighter + 0.05) / (darker + 0.05);
}

function rgb(value: string): Rgb {
  const parts = value.match(/\d+(?:\.\d+)?/g)?.slice(0, 3).map(Number);
  if (!parts || parts.length !== 3) throw new Error(`RGB 색상을 읽을 수 없습니다: ${value}`);
  return [parts[0], parts[1], parts[2]];
}

test("공개 헤더와 로그인 제어는 키보드 포커스·이름·44px 터치 영역을 제공한다", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const brand = page.getByRole("link", { name: "OnlineLecture" });
  await page.keyboard.press("Tab");
  await expect(brand).toBeFocused();
  await expect(brand).toHaveCSS("outline-style", "solid");
  await expect(brand).toHaveCSS("outline-width", "2px");

  const headerControls = page.locator("header a, header button");
  for (const control of await headerControls.all()) {
    if (!(await control.isVisible())) continue;
    await expect(control).toHaveAccessibleName(/.+/);
    const box = await control.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }

  await page.goto("/login");
  const login = page.getByRole("button", { name: "Google로 계속하기" });
  await expect(login).toHaveAccessibleName("Google로 계속하기");
  const box = await login.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await login.focus();
  await expect(login).toHaveCSS("outline-style", "solid");
});

test("모바일 메뉴는 이름 있는 44px 제어와 Tab·Escape·경로 이동 닫힘을 제공한다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");

  const menuButton = page.getByRole("button", { name: "메뉴 열기" });
  await expect(menuButton).toHaveAccessibleName("메뉴 열기");
  await menuButton.focus();
  await menuButton.press("Enter");
  const navigation = page.getByRole("navigation", { name: "모바일 메뉴" });
  await expect(navigation).toBeVisible();

  for (const link of await navigation.getByRole("link").all()) {
    await expect(link).toHaveAccessibleName(/.+/);
    const box = await link.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }

  await page.keyboard.press("Tab");
  await expect(navigation.getByRole("link", { name: "홈" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();

  await menuButton.press("Enter");
  await navigation.getByRole("link", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("navigation", { name: "모바일 메뉴" })).toHaveCount(0);
});

test("공개 화면의 본문 보조 텍스트와 배경은 WCAG AA 대비를 충족한다", async ({ page }) => {
  await page.goto("/");
  const contrast = await page.locator("main > section > p").first().evaluate((element) => {
    const style = globalThis.getComputedStyle(element);
    return { background: globalThis.getComputedStyle(globalThis.document.body).backgroundColor, foreground: style.color };
  });

  expect(contrastRatio(rgb(contrast.foreground), rgb(contrast.background))).toBeGreaterThanOrEqual(4.5);
});
