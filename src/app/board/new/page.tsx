import { createPost } from "../../../features/posts/actions";
import { PostEditor } from "../../../features/posts/editor";
import { requirePageRole } from "../../../lib/auth/require-role";

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
