import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

import { AuthorizationError, requireRole } from "../../lib/auth/require-role";
import {
  createCourse,
  deleteCourse,
  updateCourse,
  type CourseMutationClient,
} from "../../app/admin/courses/actions";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("../../lib/auth/require-role", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/auth/require-role")>();
  return { ...actual, requireRole: vi.fn() };
});

const admin = { id: "00000000-0000-0000-0000-000000000001", role: "admin" as const };

function courseForm(values: Record<string, string> = {}) {
  const formData = new globalThis.FormData();
  formData.set("title", "현대 미술 입문");
  formData.set("slug", "modern-art");
  formData.set("description", "현대 미술의 흐름을 살펴봅니다.");

  for (const [name, value] of Object.entries(values)) {
    formData.set(name, value);
  }

  return formData;
}

function createClient({
  deleteError = null,
  insertError = null,
  updateError = null,
}: {
  deleteError?: { code?: string; message?: string } | null;
  insertError?: { code?: string; message?: string } | null;
  updateError?: { code?: string; message?: string } | null;
} = {}) {
  const insert = vi.fn().mockResolvedValue({ error: insertError });
  const updateEq = vi.fn().mockResolvedValue({ error: updateError });
  const update = vi.fn().mockReturnValue({ eq: updateEq });
  const deleteEq = vi.fn().mockResolvedValue({ error: deleteError });
  const remove = vi.fn().mockReturnValue({ eq: deleteEq });

  const client: CourseMutationClient = {
    from: vi.fn().mockReturnValue({ delete: remove, insert, update }),
  };

  return { client, deleteEq, insert, remove, update, updateEq };
}

describe("관리자 강의 액션", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireRole).mockResolvedValue(admin);
  });

  it("관리자는 검증된 강의를 만들고 관리자 목록으로 돌아간다", async () => {
    const { client, insert } = createClient();

    await createCourse(courseForm({ is_published: "on" }), async () => client);

    expect(requireRole).toHaveBeenCalledWith("admin");
    expect(insert).toHaveBeenCalledWith({
      description: "현대 미술의 흐름을 살펴봅니다.",
      is_published: true,
      slug: "modern-art",
      title: "현대 미술 입문",
    });
    expect(redirect).toHaveBeenCalledWith("/admin/courses?notice=created");
  });

  it("회원은 DB 변경 전에 관리자 강의 생성을 거부당한다", async () => {
    const { client, insert } = createClient();
    vi.mocked(requireRole).mockRejectedValue(new AuthorizationError());

    await createCourse(courseForm(), async () => client);

    expect(insert).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/admin/courses?error=forbidden");
  });

  it("제목, slug, 설명과 공개 상태가 형식에 맞지 않으면 저장하지 않는다", async () => {
    const { client, insert } = createClient();

    await createCourse(
      courseForm({ description: "x".repeat(2001), is_published: "yes", slug: "Modern Art", title: "  " }),
      async () => client,
    );

    expect(insert).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/admin/courses?error=invalid");
  });

  it("사용자 입력의 author나 role은 저장 데이터에 포함하지 않는다", async () => {
    const { client, insert } = createClient();
    const formData = courseForm({ author_id: "attacker", role: "admin" });

    await createCourse(formData, async () => client);

    expect(insert).toHaveBeenCalledWith({
      description: "현대 미술의 흐름을 살펴봅니다.",
      is_published: false,
      slug: "modern-art",
      title: "현대 미술 입문",
    });
  });

  it("관리자는 검증된 값으로 지정한 강의를 수정한다", async () => {
    const { client, update, updateEq } = createClient();
    const id = "00000000-0000-4000-8000-000000000010";

    await updateCourse(courseForm({ id, title: "수정된 강의" }), async () => client);

    expect(update).toHaveBeenCalledWith({
      description: "현대 미술의 흐름을 살펴봅니다.",
      is_published: false,
      slug: "modern-art",
      title: "수정된 강의",
    });
    expect(updateEq).toHaveBeenCalledWith("id", id);
    expect(redirect).toHaveBeenCalledWith("/admin/courses?notice=updated");
  });

  it("관리자는 유효한 식별자의 강의를 삭제한다", async () => {
    const { client, deleteEq, remove } = createClient();
    const id = "00000000-0000-4000-8000-000000000010";

    await deleteCourse(courseForm({ id }), async () => client);

    expect(remove).toHaveBeenCalledOnce();
    expect(deleteEq).toHaveBeenCalledWith("id", id);
    expect(redirect).toHaveBeenCalledWith("/admin/courses?notice=deleted");
  });

  it("DB 오류 원문과 slug 중복 세부 정보는 노출하지 않는다", async () => {
    const { client } = createClient({
      insertError: { code: "23505", message: 'duplicate key value violates "courses_slug_key"' },
    });

    await createCourse(courseForm(), async () => client);

    expect(redirect).toHaveBeenCalledWith("/admin/courses?error=save");
  });
});
