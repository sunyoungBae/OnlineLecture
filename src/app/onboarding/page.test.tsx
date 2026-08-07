import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

import { OnboardingForm } from "./form";
import {
  renderOnboardingPage,
  type OnboardingPageClient,
} from "./page";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

function createClient(user: { id: string } | null): OnboardingPageClient {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
  };
}

describe("renderOnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("비인증 요청은 안전한 온보딩 next를 포함한 로그인으로 보낸다", async () => {
    await expect(renderOnboardingPage(async () => createClient(null))).resolves.toBeUndefined();

    expect(redirect).toHaveBeenCalledWith("/login?next=/onboarding");
  });

  it("인증된 요청에만 클라이언트 별명 폼을 렌더링한다", async () => {
    const page = await renderOnboardingPage(async () =>
      createClient({ id: "00000000-0000-0000-0000-000000000001" }),
    );

    expect(redirect).not.toHaveBeenCalled();
    expect(page).toMatchObject({
      props: {
        children: expect.arrayContaining([expect.objectContaining({ type: OnboardingForm })]),
      },
      type: "main",
    });
  });
});
