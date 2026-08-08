import { redirect as nextRedirect } from "next/navigation";

import { requirePageRole } from "../../lib/auth/require-role";
import { createClient as createSupabaseClient } from "../../lib/supabase/server";
import { validatePostInput } from "./content";
import type { PostEditorState, PostFormData } from "./editor";

const CREATE_ERROR_MESSAGE = "게시글을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
const UPDATE_ERROR_MESSAGE = "게시글을 수정하지 못했습니다. 잠시 후 다시 시도해 주세요.";

type PostClient = {
  from: (table: "posts") => {
    insert: (post: {
      author_id: string;
      content: unknown;
      search_text: string;
      title: string;
    }) => Promise<{ error: unknown }>;
    update: (post: { content: unknown; search_text: string; title: string }) => {
      eq: (column: "id", value: string) => {
        eq: (column: "author_id", value: string) => {
          select: (columns: "id") => Promise<{ data: { id: string }[] | null; error: unknown }>;
        };
      };
    };
  };
};

export type PostActionDependencies = {
  createClient: () => Promise<PostClient>;
  redirect: (path: string) => never;
  requirePageRole: (
    role: "member",
    options: { nextPath: string },
  ) => Promise<{ id: string; role: "member" | "admin" }>;
};

const defaultDependencies: PostActionDependencies = {
  createClient: async () => (await createSupabaseClient()) as unknown as PostClient,
  redirect: nextRedirect,
  requirePageRole,
};

function validationError(reason: string) {
  if (reason === "invalid_title_length") {
    return "제목은 1자 이상 120자 이하여야 합니다.";
  }

  if (reason === "invalid_content_length") {
    return "본문은 일반 텍스트 기준 1자 이상 20,000자 이하여야 합니다.";
  }

  return "허용하지 않는 본문 형식입니다.";
}

function parsedInput(formData: PostFormData) {
  const title = formData.get("title");
  const content = formData.get("content");
  if (typeof content !== "string") {
    return { valid: false as const, message: "허용하지 않는 본문 형식입니다." };
  }

  try {
    const validation = validatePostInput({ title, content: JSON.parse(content) });
    if (!validation.valid) {
      return { valid: false as const, message: validationError(validation.reason) };
    }

    return { valid: true as const, value: validation.value };
  } catch {
    return { valid: false as const, message: "허용하지 않는 본문 형식입니다." };
  }
}

export function createPostAction(dependencies: PostActionDependencies = defaultDependencies) {
  return async function createPost(
    _previousState: PostEditorState,
    formData: PostFormData,
  ): Promise<PostEditorState> {
    "use server";

    const profile = await dependencies.requirePageRole("member", { nextPath: "/board/new" });
    const input = parsedInput(formData);
    if (!input.valid) {
      return { status: "error", message: input.message };
    }

    try {
      const supabase = await dependencies.createClient();
      const { error } = await supabase.from("posts").insert({
        author_id: profile.id,
        content: input.value.content,
        search_text: input.value.plainText,
        title: input.value.title,
      });

      if (error) {
        return { status: "error", message: CREATE_ERROR_MESSAGE };
      }
    } catch {
      return { status: "error", message: CREATE_ERROR_MESSAGE };
    }

    return dependencies.redirect("/board");
  };
}

export function createUpdatePostAction(
  postId: string,
  dependencies: PostActionDependencies = defaultDependencies,
) {
  return async function updatePost(
    _previousState: PostEditorState,
    formData: PostFormData,
  ): Promise<PostEditorState> {
    "use server";

    const profile = await dependencies.requirePageRole("member", {
      nextPath: `/board/${encodeURIComponent(postId)}/edit`,
    });
    const input = parsedInput(formData);
    if (!input.valid) {
      return { status: "error", message: input.message };
    }

    try {
      const supabase = await dependencies.createClient();
      const { data, error } = await supabase
        .from("posts")
        .update({
          content: input.value.content,
          search_text: input.value.plainText,
          title: input.value.title,
        })
        .eq("id", postId)
        .eq("author_id", profile.id)
        .select("id");

      if (error || !data || data.length !== 1) {
        return { status: "error", message: UPDATE_ERROR_MESSAGE };
      }
    } catch {
      return { status: "error", message: UPDATE_ERROR_MESSAGE };
    }

    return dependencies.redirect(`/board/${encodeURIComponent(postId)}`);
  };
}
