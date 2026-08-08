import { redirect as nextRedirect } from "next/navigation";

import {
  savePostAttachments as defaultSavePostAttachments,
  type PostAttachmentSaveResult,
} from "../attachments/post-files";
import { requirePageRole } from "../../lib/auth/require-role";
import { createClient as createSupabaseClient } from "../../lib/supabase/server";
import { validatePostInput } from "./content";
import type { PostEditorState, PostFormData } from "./editor";

const CREATE_ERROR_MESSAGE = "게시글을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
const CLEANUP_ERROR_MESSAGE = "게시글 저장을 정리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
const UPDATE_ERROR_MESSAGE = "게시글을 수정하지 못했습니다. 잠시 후 다시 시도해 주세요.";

type PostClient = {
  from: (table: "posts") => {
    delete: () => {
      eq: (column: "id", value: string) => {
        eq: (column: "author_id", value: string) => {
          select: (columns: "id") => Promise<{ data: { id: string }[] | null; error: unknown }>;
        };
      };
    };
    insert: (post: { author_id: string; content: unknown; search_text: string; title: string }) => {
      select: (columns: "id") => {
        single: () => Promise<{ data: { id: string } | null; error: unknown }>;
      };
    };
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
  savePostAttachments: (
    postId: string,
    authorId: string,
    files: readonly { name: string; size: number; type: string }[],
  ) => Promise<PostAttachmentSaveResult>;
};

const defaultDependencies: PostActionDependencies = {
  createClient: async () => (await createSupabaseClient()) as unknown as PostClient,
  redirect: nextRedirect,
  requirePageRole,
  savePostAttachments: defaultSavePostAttachments,
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

function attachmentFiles(formData: PostFormData) {
  const files = formData.getAll?.("files") ?? [];
  if (
    files.some(
      (file) =>
        !file ||
        typeof file !== "object" ||
        typeof (file as { name?: unknown }).name !== "string" ||
        typeof (file as { size?: unknown }).size !== "number" ||
        typeof (file as { type?: unknown }).type !== "string",
    )
  ) {
    return null;
  }

  return files as { name: string; size: number; type: string }[];
}

export function createPostAction(dependencies: PostActionDependencies = defaultDependencies) {
  return (previousState: PostEditorState, formData: PostFormData) =>
    createPostWithDependencies(previousState, formData, dependencies);
}

async function removeCreatedPost(client: PostClient, postId: string, authorId: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await client
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("author_id", authorId)
        .select("id");
      if (!result.error && result.data?.length === 1) return true;
    } catch {
      // 재시도 후 일반 cleanup 오류를 반환한다.
    }
  }
  return false;
}

async function createPostWithDependencies(
  _previousState: PostEditorState,
  formData: PostFormData,
  dependencies: PostActionDependencies,
): Promise<PostEditorState> {

    const profile = await dependencies.requirePageRole("member", { nextPath: "/board/new" });
    const input = parsedInput(formData);
    if (!input.valid) {
      return { status: "error", message: input.message };
    }
    const files = attachmentFiles(formData);
    if (!files) {
      return { status: "error", message: CREATE_ERROR_MESSAGE };
    }

    try {
      const supabase = await dependencies.createClient();
      const { data: post, error } = await supabase
        .from("posts")
        .insert({
          author_id: profile.id,
          content: input.value.content,
          search_text: input.value.plainText,
          title: input.value.title,
        })
        .select("id")
        .single();

      if (error || !post) {
        return { status: "error", message: CREATE_ERROR_MESSAGE };
      }

      if (files.length) {
        const attachments = await dependencies.savePostAttachments(post.id, profile.id, files);
        if (!attachments.ok) {
          const removed = await removeCreatedPost(supabase, post.id, profile.id);
          return {
            status: "error",
            message: removed ? CREATE_ERROR_MESSAGE : CLEANUP_ERROR_MESSAGE,
          };
        }
      }
    } catch {
      return { status: "error", message: CREATE_ERROR_MESSAGE };
    }

    return dependencies.redirect("/board");
}

export async function createPost(
  previousState: PostEditorState,
  formData: PostFormData,
): Promise<PostEditorState> {
  "use server";

  return createPostWithDependencies(previousState, formData, defaultDependencies);
}

export function createUpdatePostAction(
  postId: string,
  dependencies: PostActionDependencies = defaultDependencies,
) {
  return (previousState: PostEditorState, formData: PostFormData) =>
    updatePostWithDependencies(postId, previousState, formData, dependencies);
}

async function updatePostWithDependencies(
  postId: string,
  _previousState: PostEditorState,
  formData: PostFormData,
  dependencies: PostActionDependencies,
): Promise<PostEditorState> {

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
}

export async function updatePost(
  postId: string,
  previousState: PostEditorState,
  formData: PostFormData,
): Promise<PostEditorState> {
  "use server";

  return updatePostWithDependencies(postId, previousState, formData, defaultDependencies);
}
