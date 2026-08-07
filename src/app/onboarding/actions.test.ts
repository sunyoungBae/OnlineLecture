import { describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

import {
  completeOnboarding,
  initialOnboardingState,
  type OnboardingClient,
} from "./actions";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

function onboardingForm(nickname: string) {
  const formData = new globalThis.FormData();
  formData.set("nickname", nickname);
  return formData;
}

function createClient({
  authError = null,
  authThrows,
  insertError = null,
  insertThrows,
  user = { id: "00000000-0000-0000-0000-000000000001" },
}: {
  authError?: unknown;
  authThrows?: unknown;
  insertError?: { code?: string; message?: string } | null;
  insertThrows?: unknown;
  user?: { id: string } | null;
} = {}) {
  const insert = insertThrows
    ? vi.fn().mockRejectedValue(insertThrows)
    : vi.fn().mockResolvedValue({ error: insertError });

  const client: OnboardingClient = {
    auth: {
      getUser: authThrows
        ? vi.fn().mockRejectedValue(authThrows)
        : vi.fn().mockResolvedValue({ data: { user }, error: authError }),
    },
    from: vi.fn().mockReturnValue({ insert }),
  };

  return { client, insert };
}

describe("completeOnboarding", () => {
  it("성공하면 내부 완료 경로로 이동한다", async () => {
    const { client } = createClient();

    await expect(
      completeOnboarding(initialOnboardingState, onboardingForm("Learner_01"), async () => client),
    ).resolves.toBeUndefined();
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("인증된 사용자 ID만으로 member 프로필을 만든다", async () => {
    const { client, insert } = createClient();
    const formData = onboardingForm("Learner_01");
    formData.set("id", "00000000-0000-0000-0000-000000000999");
    formData.set("role", "admin");

    await expect(
      completeOnboarding(initialOnboardingState, formData, async () => client),
    ).resolves.toBeUndefined();

    expect(insert).toHaveBeenCalledWith({
      id: "00000000-0000-0000-0000-000000000001",
      nickname: "Learner_01",
    });
  });

  it("미인증 사용자의 프로필 삽입을 거부한다", async () => {
    const { client, insert } = createClient({ user: null });

    await expect(
      completeOnboarding(initialOnboardingState, onboardingForm("Learner_01"), async () => client),
    ).resolves.toEqual({
      status: "error",
      message: "로그인 후 별명을 설정할 수 있습니다.",
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("인증 확인 오류가 나면 프로필을 삽입하지 않는다", async () => {
    const { client, insert } = createClient({ authError: new Error("network") });

    await expect(
      completeOnboarding(initialOnboardingState, onboardingForm("Learner_01"), async () => client),
    ).resolves.toEqual({
      status: "error",
      message: "로그인 후 별명을 설정할 수 있습니다.",
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("형식이 잘못된 별명은 DB 클라이언트를 호출하지 않는다", async () => {
    const clientFactory = vi.fn(async () => createClient().client);

    await expect(
      completeOnboarding(initialOnboardingState, onboardingForm("not-valid"), clientFactory),
    ).resolves.toEqual({
      status: "error",
      message: "별명에는 한글, 영문, 숫자, 밑줄만 사용할 수 있습니다.",
    });
    expect(clientFactory).not.toHaveBeenCalled();
  });

  it("별명 unique index의 23505만 중복 별명 오류로 안내한다", async () => {
    const { client } = createClient({
      insertError: {
        code: "23505",
        message:
          'duplicate key value violates unique constraint "profiles_nickname_lower_key"',
      },
    });

    await expect(
      completeOnboarding(initialOnboardingState, onboardingForm("Learner_01"), async () => client),
    ).resolves.toEqual({
      status: "error",
      message: "이미 사용 중인 별명입니다.",
    });
  });

  it("다른 23505 오류는 중복 별명으로 숨기지 않는다", async () => {
    const { client } = createClient({
      insertError: {
        code: "23505",
        message: 'duplicate key value violates unique constraint "profiles_pkey"',
      },
    });

    await expect(
      completeOnboarding(initialOnboardingState, onboardingForm("Learner_01"), async () => client),
    ).resolves.toEqual({
      status: "error",
      message: "별명을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    });
  });

  it.each([
    { code: "23514", message: "nickname format check failed" },
    { code: "42501", message: "permission denied" },
  ])("DB 오류 $code는 원문 없이 일반 저장 오류로 안내한다", async (insertError) => {
    const { client } = createClient({ insertError });

    await expect(
      completeOnboarding(initialOnboardingState, onboardingForm("Learner_01"), async () => client),
    ).resolves.toEqual({
      status: "error",
      message: "별명을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    });
  });

  it("DB 호출 예외는 원문 없이 일반 저장 오류로 안내한다", async () => {
    const { client } = createClient({ insertThrows: new Error("database unavailable") });

    await expect(
      completeOnboarding(initialOnboardingState, onboardingForm("Learner_01"), async () => client),
    ).resolves.toEqual({
      status: "error",
      message: "별명을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    });
  });

  it("인증 확인 호출 예외는 원문 없이 일반 저장 오류로 안내한다", async () => {
    const { client } = createClient({ authThrows: new Error("auth unavailable") });

    await expect(
      completeOnboarding(initialOnboardingState, onboardingForm("Learner_01"), async () => client),
    ).resolves.toEqual({
      status: "error",
      message: "별명을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    });
  });

  it("DB 클라이언트 생성 예외는 원문 없이 일반 저장 오류로 안내한다", async () => {
    await expect(
      completeOnboarding(
        initialOnboardingState,
        onboardingForm("Learner_01"),
        async () => Promise.reject(new Error("client unavailable")),
      ),
    ).resolves.toEqual({
      status: "error",
      message: "별명을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    });
  });
});
