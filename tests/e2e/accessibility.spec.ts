import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";

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
    const description = await control.textContent();
    expect(box?.width, description ?? "header control").toBeGreaterThanOrEqual(44);
    expect(box?.height, description ?? "header control").toBeGreaterThanOrEqual(44);
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
    const description = await link.textContent();
    expect(box?.width, description ?? "mobile navigation link").toBeGreaterThanOrEqual(44);
    expect(box?.height, description ?? "mobile navigation link").toBeGreaterThanOrEqual(44);
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

test("mock된 강의와 게시판 경로는 실제 빈 상태를 키보드로 탐색한다", async ({ page }) => {
  await setMockMode(page, "empty");
  await page.goto("/board");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveCSS("outline-style", "solid");
  await expect(page.getByText("아직 게시글이 없습니다.")).toBeVisible();
});

async function setMockMode(page: import("@playwright/test").Page, mode: string) {
  await page.request.get(`http://127.0.0.1:54321/__mock?mode=${mode}`);
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const accessToken = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    aud: "authenticated",
    exp: now + 3600,
    role: "authenticated",
    sub: "10000000-0000-4000-8000-000000000001",
  })}.mock-signature`;
  const session = {
    access_token: accessToken,
    expires_at: now + 3600,
    expires_in: 3600,
    refresh_token: "mock-refresh-token",
    token_type: "bearer",
    user: { id: "10000000-0000-4000-8000-000000000001" },
  };
  await page.context().addCookies([{
    domain: "127.0.0.1",
    name: "sb-127-auth-token",
    path: "/",
    value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`,
  }]);
}

async function expectMainKeyboardContract(page: import("@playwright/test").Page) {
  const main = page.locator("main").last();
  const controls = main.locator('a, button, input:not([type="hidden"]), textarea, select');
  await page.evaluate(() => (globalThis.document.activeElement as globalThis.HTMLElement | null)?.blur());
  for (let index = 0; index < 30; index += 1) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(() => Boolean((globalThis.document.activeElement as globalThis.HTMLElement | null)?.closest("main")))) break;
  }
  await expect(main.locator(":focus").last()).toHaveCSS("outline-style", "solid");
  for (const control of await controls.all()) {
    if (!(await control.isVisible()) || await control.isDisabled()) continue;
    await expect(control).toHaveAccessibleName(/.+/);
    const box = await control.boundingBox();
    const description = await control.evaluate((element) => `${element.tagName.toLowerCase()} ${element.getAttribute("name") ?? ""} ${element.textContent?.trim() ?? ""}`);
    expect(box?.width, description).toBeGreaterThanOrEqual(44);
    expect(box?.height, description).toBeGreaterThanOrEqual(44);
    await control.focus();
    await expect(control).toHaveCSS("outline-style", "solid");
  }
}

async function expectEffectiveBackgroundContrast(page: import("@playwright/test").Page) {
  const colors = await page.locator("main").last().locator("h1, h2, h3, p, a, button, label").evaluateAll((elements) =>
    elements.filter((element) => element.textContent?.trim()).map((element) => {
      let current: typeof element | null = element;
      let background = "rgb(255, 255, 255)";
      while (current) {
        const candidate = globalThis.getComputedStyle(current).backgroundColor;
        if (!candidate.endsWith(", 0)") && candidate !== "transparent") {
          background = candidate;
          break;
        }
        current = current.parentElement;
      }
      return { background, foreground: globalThis.getComputedStyle(element).color, text: element.textContent?.trim() };
    }),
  );
  for (const color of colors) {
    expect(contrastRatio(rgb(color.foreground), rgb(color.background)), color.text).toBeGreaterThanOrEqual(4.5);
  }
}

test("courses/detail/board/onboarding/admin 정상 렌더는 실제 키보드 계약을 충족한다", async ({ page }) => {
  await setMockMode(page, "normal");
  for (const path of ["/courses", "/courses/accessible-course", "/board", "/board/40000000-0000-4000-8000-000000000001", "/onboarding", "/admin/courses"] as const) {
    await page.goto(path);
    await expect(page.locator("main").last()).toBeVisible();
    await expectMainKeyboardContract(page);
    await expectEffectiveBackgroundContrast(page);
  }
  await expect(page.locator('form:has(button:text-is("삭제")) input[name="direction"]')).toHaveCount(0);
});

test("실제 빈·오류·forbidden 렌더는 이름 있는 복구 제어와 상태 역할을 제공한다", async ({ page }) => {
  await setMockMode(page, "empty");
  await page.goto("/courses");
  await expect(page.getByText("현재 공개된 강의가 없습니다")).toBeVisible();
  await page.goto("/board");
  await expect(page.getByText("아직 게시글이 없습니다.")).toBeVisible();

  await setMockMode(page, "posts-error");
  await page.goto("/board");
  await expect(page.locator("main").last().getByRole("alert")).toBeVisible();
  const recovery = page.getByRole("link", { name: "목록 새로고침" });
  await expect(recovery).toHaveAccessibleName("목록 새로고침");
  const recoveryBox = await recovery.boundingBox();
  expect(recoveryBox?.width).toBeGreaterThanOrEqual(44);
  expect(recoveryBox?.height).toBeGreaterThanOrEqual(44);
  await recovery.focus();
  await expect(recovery).toHaveCSS("outline-style", "solid");

  await setMockMode(page, "courses-error");
  await page.goto("/courses");
  await expect(page.getByRole("alert")).toBeVisible();

  await setMockMode(page, "normal");
  await page.goto("/admin/courses?error=forbidden");
  await expect(page.getByRole("heading", { name: "이 페이지에 접근할 권한이 없습니다" })).toBeVisible();
  await expect(page.locator("main").last().getByRole("alert")).toBeVisible();
});
