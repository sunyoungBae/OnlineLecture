import { expect, test } from "@playwright/test";

test("Google 로그인은 PKCE 콜백과 안전한 next 경로를 전달한다", async ({ page }) => {
  let authorizeUrl: URL | undefined;

  await page.route("http://127.0.0.1:54321/auth/v1/authorize**", async (route) => {
    authorizeUrl = new URL(route.request().url());
    await route.fulfill({ status: 204 });
  });

  await page.goto("/login?next=%2Fcourses");
  await page.getByRole("button", { name: "Google로 계속하기" }).click();

  await expect.poll(() => authorizeUrl?.searchParams.get("provider")).toBe("google");
  expect(authorizeUrl?.searchParams.get("code_challenge")).toBeTruthy();
  expect(authorizeUrl?.searchParams.get("code_challenge_method")).toBe("s256");

  const redirectTo = new URL(authorizeUrl!.searchParams.get("redirect_to")!);
  expect(redirectTo.origin).toBe("http://127.0.0.1:3000");
  expect(redirectTo.pathname).toBe("/auth/callback");
  expect(redirectTo.searchParams.get("next")).toBe("/courses");
});

test("외부 next URL은 사이트 밖 리디렉션으로 사용하지 않는다", async ({ page }) => {
  let authorizeUrl: URL | undefined;

  await page.route("http://127.0.0.1:54321/auth/v1/authorize**", async (route) => {
    authorizeUrl = new URL(route.request().url());
    await route.fulfill({ status: 204 });
  });

  await page.goto("/login?next=https%3A%2F%2Fevil.example%2Fsteal");
  await page.getByRole("button", { name: "Google로 계속하기" }).click();

  await expect.poll(() => authorizeUrl?.searchParams.get("redirect_to")).toBeTruthy();
  const redirectTo = new URL(authorizeUrl!.searchParams.get("redirect_to")!);
  expect(redirectTo.origin).toBe("http://127.0.0.1:3000");
  expect(redirectTo.searchParams.get("next")).toBe("/");
});

test("코드가 없는 콜백은 같은 출처의 로그인 화면으로 거부한다", async ({ request }) => {
  const response = await request.get(
    "/auth/callback?next=https%3A%2F%2Fevil.example%2Fsteal",
    { maxRedirects: 0 },
  );

  expect(response.status()).toBe(307);
  const location = new URL(response.headers().location);
  expect(location.origin).toBe("http://127.0.0.1:3000");
  expect(location.pathname).toBe("/login");
  expect(location.searchParams.get("error")).toBe("oauth_callback");
});

test("로그인 응답에 서버 전용 키가 노출되지 않는다", async ({ page }) => {
  const response = await page.goto("/login");

  expect(response).not.toBeNull();
  expect(await response!.text()).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
});
