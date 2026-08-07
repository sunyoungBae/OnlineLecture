import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

import {
  AuthorizationError,
  requireRole,
  type RequireRoleClient,
} from "./require-role";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const member = {
  id: "00000000-0000-0000-0000-000000000001",
  role: "member" as const,
};

function createClient({
  authError = null,
  profile = member,
  profileError = null,
  profileThrows,
  user = { id: member.id },
}: {
  authError?: unknown;
  profile?: { id: string; role: string } | null;
  profileError?: unknown;
  profileThrows?: unknown;
  user?: { id: string } | null;
} = {}): RequireRoleClient {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: authError }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: profileThrows
            ? vi.fn().mockRejectedValue(profileThrows)
            : vi.fn().mockResolvedValue({ data: profile, error: profileError }),
        }),
      }),
    }),
  };
}

describe("requireRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("member 경로에서 인증된 회원 프로필을 반환한다", async () => {
    const client = createClient();

    await expect(requireRole("member", { clientFactory: async () => client })).resolves.toEqual(
      member,
    );
    expect(redirect).not.toHaveBeenCalled();
  });

  it("admin은 member 경로에도 접근할 수 있다", async () => {
    const admin = { ...member, role: "admin" };

    await expect(
      requireRole("member", {
        clientFactory: async () => createClient({ profile: admin }),
      }),
    ).resolves.toEqual(admin);
  });

  it("비인증 요청은 안전한 내부 next를 포함한 로그인으로 보낸다", async () => {
    await expect(
      requireRole("member", {
        clientFactory: async () => createClient({ user: null }),
        nextPath: "/courses?tab=all",
      }),
    ).resolves.toBeUndefined();

    expect(redirect).toHaveBeenCalledWith("/login?next=%2Fcourses%3Ftab%3Dall");
  });

  it.each(["//attacker.example", "/\\attacker.example", "/%2f%2fattacker.example"])(
    "공격 경로 %s는 로그인 후 홈으로 제한한다",
    async (nextPath) => {
      await expect(
        requireRole("member", {
          clientFactory: async () => createClient({ user: null }),
          nextPath,
        }),
      ).resolves.toBeUndefined();

      expect(redirect).toHaveBeenCalledWith("/login?next=%2F");
    },
  );

  it("프로필이 없는 인증 사용자는 온보딩으로 보낸다", async () => {
    await expect(
      requireRole("member", {
        clientFactory: async () => createClient({ profile: null }),
      }),
    ).resolves.toBeUndefined();

    expect(redirect).toHaveBeenCalledWith("/onboarding");
  });

  it("member는 admin 경로에서 일반 권한 오류를 받는다", async () => {
    await expect(
      requireRole("admin", { clientFactory: async () => createClient() }),
    ).rejects.toEqual(new AuthorizationError());
  });

  it("조회 결과의 프로필 ID가 인증 사용자와 다르면 일반 권한 오류를 받는다", async () => {
    await expect(
      requireRole("member", {
        clientFactory: async () =>
          createClient({
            profile: { id: "00000000-0000-0000-0000-000000000999", role: "member" },
          }),
      }),
    ).rejects.toEqual(new AuthorizationError());
  });

  it("프로필 조회 응답 오류는 일반 오류 경계로 전파한다", async () => {
    const databaseError = new Error("database unavailable");

    await expect(
      requireRole("member", {
        clientFactory: async () => createClient({ profileError: databaseError }),
      }),
    ).rejects.toBe(databaseError);
  });

  it("프로필 조회 예외은 온보딩으로 오인하지 않고 일반 오류 경계로 전파한다", async () => {
    const databaseError = new Error("network unavailable");

    await expect(
      requireRole("member", {
        clientFactory: async () => createClient({ profileThrows: databaseError }),
      }),
    ).rejects.toBe(databaseError);
  });
});
