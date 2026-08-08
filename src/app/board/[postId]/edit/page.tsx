import { notFound, redirect } from "next/navigation";

import { validatePostInput } from "../../../../features/posts/content";
import {
  PostEditor,
  type PostEditorState,
  type PostFormData,
} from "../../../../features/posts/editor";
import { requirePageRole } from "../../../../lib/auth/require-role";
import { createClient } from "../../../../lib/supabase/server";
import type { Json } from "../../../../types/database";

const UPDATE_ERROR_MESSAGE = "게시글을 수정하지 못했습니다. 잠시 후 다시 시도해 주세요.";

function validationError(reason: string) {
  if (reason === "invalid_title_length") {
    return "제목은 1자 이상 120자 이하여야 합니다.";
  }

  if (reason === "invalid_content_length") {
    return "본문은 일반 텍스트 기준 1자 이상 20,000자 이하여야 합니다.";
  }

  return "허용하지 않는 본문 형식입니다.";
}

function editPath(postId: string) {
  return `/board/${encodeURIComponent(postId)}/edit`;
}

function updatePost(postId: string) {
  return async function savePost(
    _previousState: PostEditorState,
    formData: PostFormData,
  ): Promise<PostEditorState> {
    "use server";

    const title = formData.get("title");
    const content = formData.get("content");
    if (typeof content !== "string") {
      return { status: "error", message: "허용하지 않는 본문 형식입니다." };
    }

    let parsedContent: unknown;
    try {
      parsedContent = JSON.parse(content);
    } catch {
      return { status: "error", message: "허용하지 않는 본문 형식입니다." };
    }

    const validation = validatePostInput({ title, content: parsedContent });
    if (!validation.valid) {
      return { status: "error", message: validationError(validation.reason) };
    }

    const profile = await requirePageRole("member", { nextPath: editPath(postId) });
    try {
      const supabase = await createClient();
      const { error } = await supabase
        .from("posts")
        .update({
          content: validation.value.content as unknown as Json,
          search_text: validation.value.plainText,
          title: validation.value.title,
        })
        .eq("id", postId)
        .eq("author_id", profile.id);

      if (error) {
        return { status: "error", message: UPDATE_ERROR_MESSAGE };
      }
    } catch {
      return { status: "error", message: UPDATE_ERROR_MESSAGE };
    }

    redirect(`/board/${encodeURIComponent(postId)}`);
  };
}

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const profile = await requirePageRole("member", { nextPath: editPath(postId) });
  const supabase = await createClient();
  const { data: post, error } = await supabase
    .from("posts")
    .select("id, author_id, title, content")
    .eq("id", postId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!post || post.author_id !== profile.id) {
    notFound();
  }

  const validation = validatePostInput({ title: post.title, content: post.content });
  if (!validation.valid) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-[var(--reading-max-width)] px-[var(--page-padding)] py-16">
      <h1 className="font-[family-name:var(--font-noto-serif-kr)] text-4xl font-semibold tracking-tight">
        게시글 수정
      </h1>
      <PostEditor
        action={updatePost(post.id)}
        initialContent={validation.value.content}
        initialTitle={validation.value.title}
        submitLabel="수정 저장"
      />
    </main>
  );
}
