import { notFound } from "next/navigation";

import { updatePost } from "../../../../features/posts/actions";
import { validatePostInput } from "../../../../features/posts/content";
import { PostEditor } from "../../../../features/posts/editor";
import { requirePageRole } from "../../../../lib/auth/require-role";
import { createClient } from "../../../../lib/supabase/server";

function editPath(postId: string) {
  return `/board/${encodeURIComponent(postId)}/edit`;
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
        action={updatePost.bind(null, post.id)}
        initialContent={validation.value.content}
        initialTitle={validation.value.title}
        submitLabel="수정 저장"
      />
    </main>
  );
}
