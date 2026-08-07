"use server";

import { validateNickname } from "../../features/profile/nickname";
import { createClient } from "../../lib/supabase/server";
import { redirect } from "next/navigation";

export type OnboardingActionState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

export const initialOnboardingState: OnboardingActionState = { status: "idle" };

type OnboardingInsertError = { code?: string; message?: string } | null;

export type OnboardingClient = {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string } | null };
      error: unknown;
    }>;
  };
  from: (table: "profiles") => {
    insert: (profile: { id: string; nickname: string }) => PromiseLike<{
      error: OnboardingInsertError;
    }>;
  };
};

type OnboardingClientFactory = () => Promise<OnboardingClient>;

const ONBOARDING_COMPLETE_PATH = "/";
const SAVE_ERROR_MESSAGE = "별명을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";

function validationMessage(reason: "invalid_length" | "invalid_characters") {
  if (reason === "invalid_length") {
    return "별명은 2자 이상 20자 이하여야 합니다.";
  }

  return "별명에는 한글, 영문, 숫자, 밑줄만 사용할 수 있습니다.";
}

function isNicknameDuplicate(error: Exclude<OnboardingInsertError, null>) {
  return (
    error.code === "23505" &&
    error.message?.includes('unique constraint "profiles_nickname_lower_key"')
  );
}

export async function completeOnboarding(
  _previousState: OnboardingActionState,
  formData: FormData,
  clientFactory: OnboardingClientFactory = createClient,
): Promise<OnboardingActionState> {
  const nicknameValue = formData.get("nickname");
  if (typeof nicknameValue !== "string") {
    return {
      status: "error",
      message: "별명을 입력해 주세요.",
    };
  }

  const validation = validateNickname(nicknameValue);
  if (!validation.valid) {
    return { status: "error", message: validationMessage(validation.reason) };
  }

  try {
    const supabase = await clientFactory();
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || !data.user) {
      return {
        status: "error",
        message: "로그인 후 별명을 설정할 수 있습니다.",
      };
    }

    const { error } = await supabase
      .from("profiles")
      .insert({ id: data.user.id, nickname: validation.nickname });

    if (error) {
      if (isNicknameDuplicate(error)) {
        return { status: "error", message: "이미 사용 중인 별명입니다." };
      }

      return { status: "error", message: SAVE_ERROR_MESSAGE };
    }
  } catch {
    return { status: "error", message: SAVE_ERROR_MESSAGE };
  }

  redirect(ONBOARDING_COMPLETE_PATH);
}
