import { redirect } from "next/navigation";

import { createClient } from "../../lib/supabase/server";
import { OnboardingForm } from "./form";

export type OnboardingPageClient = {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string } | null };
      error: unknown;
    }>;
  };
};

type OnboardingPageClientFactory = () => Promise<OnboardingPageClient>;

const ONBOARDING_LOGIN_PATH = "/login?next=/onboarding";

export async function renderOnboardingPage(
  clientFactory: OnboardingPageClientFactory = createClient,
) {
  try {
    const supabase = await clientFactory();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return redirect(ONBOARDING_LOGIN_PATH);
    }
  } catch {
    return redirect(ONBOARDING_LOGIN_PATH);
  }

  return (
    <main className="mx-auto max-w-[var(--reading-max-width)] px-[var(--page-padding)] py-16">
      <h1 className="text-4xl font-semibold tracking-tight">별명을 설정하세요</h1>
      <p className="mt-6 text-[var(--muted-foreground)]">
        강의와 커뮤니티에서 사용할 공개 별명입니다.
      </p>
      <OnboardingForm />
    </main>
  );
}

export default async function OnboardingPage() {
  return renderOnboardingPage();
}
