import { redirect } from "next/navigation";

import { createClient } from "../supabase/server";

export type Role = "member" | "admin";

export type AuthenticatedProfile = {
  id: string;
  role: Role;
};

type ProfileQueryResult = {
  data: { id: string; role: string } | null;
  error: unknown;
};

export type RequireRoleClient = {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string } | null };
      error: unknown;
    }>;
  };
  from: (table: "profiles") => {
    select: (columns: "id, role") => {
      eq: (column: "id", value: string) => {
        maybeSingle: () => Promise<ProfileQueryResult>;
      };
    };
  };
};

type RequireRoleClientFactory = () => Promise<RequireRoleClient>;

export type RequireRoleOptions = {
  clientFactory?: RequireRoleClientFactory;
  nextPath?: string;
};

export class AuthorizationError extends Error {
  constructor() {
    super("권한을 확인할 수 없습니다.");
    this.name = "AuthorizationError";
  }
}

function safeInternalPath(value: string | undefined) {
  if (
    !value?.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /%(?:2f|5c)/i.test(value)
  ) {
    return "/";
  }

  return value;
}

function allows(requiredRole: Role, actualRole: Role) {
  return requiredRole === "member" || actualRole === "admin";
}

function isRole(value: string): value is Role {
  return value === "member" || value === "admin";
}

function loginPath(nextPath: string | undefined) {
  return `/login?next=${encodeURIComponent(safeInternalPath(nextPath))}`;
}

export async function requireRole(
  requiredRole: Role,
  { clientFactory, nextPath }: RequireRoleOptions = {},
): Promise<AuthenticatedProfile> {
  let supabase: RequireRoleClient;
  let user: { id: string } | null;

  try {
    supabase = await (clientFactory ?? defaultClientFactory)();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return redirect(loginPath(nextPath));
    }
    user = data.user;
  } catch {
    return redirect(loginPath(nextPath));
  }

  let profileResult: ProfileQueryResult;
  try {
    profileResult = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();
  } catch (error) {
    throw error;
  }

  const { data: profile, error } = profileResult;
  if (error) {
    throw error;
  }

  if (!profile) {
    return redirect("/onboarding");
  }

  const role = profile.role;
  if (profile.id !== user.id || !isRole(role) || !allows(requiredRole, role)) {
    throw new AuthorizationError();
  }

  return { id: profile.id, role };
}

function defaultClientFactory() {
  return createClient() as unknown as Promise<RequireRoleClient>;
}
