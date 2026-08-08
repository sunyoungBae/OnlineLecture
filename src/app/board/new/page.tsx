import { redirect } from "next/navigation";

import { validatePostInput } from "../../../features/posts/content";
import {
  PostEditor,
  type PostEditorState,
  type PostFormData,
} from "../../../features/posts/editor";
import { requirePageRole } from "../../../lib/auth/require-role";
import { createClient } from "../../../lib/supabase/server";
import type { Json } from "../../../types/database";

const CREATE_ERROR_MESSAGE = "게시글을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";

function validationError(reason: string) {
  if (reason === "invalid_title_length") {
    return "제목은 1자 이상 120자 이하여야 합니다.";
  }

  if (reason === "invalid_content_length") {
    return "본문은 일반 텍스트 기준 1자 이상 20,000자 이하여야 합니다.";
  }

  return "허용하지 않는 본문 형식입니다.";
}

async function createPost(
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

  const profile = await requirePageRole("member", { nextPath: "/board/new" });
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("posts").insert({
      author_id: profile.id,
      content: validation.value.content as unknown as Json,
      search_text: validation.value.plainText,
      title: validation.value.title,
    });

    if (error) {
      return { status: "error", message: CREATE_ERROR_MESSAGE };
    }
  } catch {
    return { status: "error", message: CREATE_ERROR_MESSAGE };
  }

  redirect("/board");
}

export default async function NewPostPage() {
  await requirePageRole("member", { nextPath: "/board/new" });

  return (
    <main className="mx-auto max-w-[var(--reading-max-width)] px-[var(--page-padding)] py-16">
      <h1 className="font-[family-name:var(--font-noto-serif-kr)] text-4xl font-semibold tracking-tight">
        새 게시글
      </h1>
      <PostEditor action={createPost} submitLabel="게시글 등록" />
    </main>
  );
}
