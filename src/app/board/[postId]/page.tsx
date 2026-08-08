import { notFound } from "next/navigation";

import { EmptyState } from "../../../components/states/empty-state";
import {
  deletePostAttachment,
  downloadPostAttachment,
  uploadPostAttachments,
} from "../../../features/attachments/post-files";
import { createClient } from "../../../lib/supabase/server";

type AttachmentFormData = { get: (name: string) => unknown; getAll: (name: string) => unknown[] };

async function uploadPostAttachmentAction(formData: AttachmentFormData) {
  "use server";

  return uploadPostAttachments(formData);
}

async function downloadPostAttachmentAction(formData: AttachmentFormData) {
  "use server";

  return downloadPostAttachment(formData);
}

async function deletePostAttachmentAction(formData: AttachmentFormData) {
  "use server";

  return deletePostAttachment(formData);
}

type Attachment = { id: string; original_filename: string; size_bytes: number };
type Post = {
  id: string;
  title: string;
  content: unknown;
  author_id: string;
  is_notice: boolean;
  created_at: string;
  attachments?: Attachment[];
};
type Comment = { id: string; body: string; author_id: string; created_at: string };

export type PostDetailClient = {
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null }; error: unknown }> };
  from: (table: "posts" | "comments") => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: Post | null; error: unknown }>;
        order: (column: string, options: { ascending: boolean }) => Promise<{ data: Comment[] | null; error: unknown }>;
      };
      order: (column: string, options: { ascending: boolean }) => Promise<{ data: Comment[] | null; error: unknown }>;
    };
  };
};

export async function loadPostDetail(
  id: string,
  factory: () => Promise<PostDetailClient> = async () => (await createClient()) as unknown as PostDetailClient,
) {
  try {
    const client = await factory();
    const viewer = await client.auth.getUser();
    const post = await client
      .from("posts")
      .select("id,title,content,author_id,is_notice,created_at,attachments(id,original_filename,size_bytes)")
      .eq("id", id)
      .maybeSingle();
    if (post.error || !post.data) {
      return { post: null, comments: [], viewerId: null, hasLoadError: Boolean(post.error) };
    }

    const comments = await client
      .from("comments")
      .select("id,body,author_id,created_at")
      .eq("post_id", id)
      .order("created_at", { ascending: true });
    return { post: post.data, comments: comments.data ?? [], viewerId: viewer.error ? null : viewer.data.user?.id ?? null, hasLoadError: Boolean(comments.error) };
  } catch {
    return { post: null, comments: [], viewerId: null, hasLoadError: true };
  }
}

export async function renderPostPage(
  params: Promise<{ postId: string }>,
  factory?: () => Promise<PostDetailClient>,
) {
  const { postId } = await params;
  const result = await loadPostDetail(postId, factory);
  if (!result.post && !result.hasLoadError) {
    notFound();
  }

  if (result.hasLoadError) {
    return (
      <main className="mx-auto max-w-[var(--reading-max-width)] px-[var(--page-padding)] py-16">
        <EmptyState
          action={{ href: "/board", label: "게시글 목록으로" }}
          description="잠시 후 다시 시도해 주세요."
          role="alert"
          title="게시글을 불러오지 못했습니다"
        />
      </main>
    );
  }

  const attachments = result.post?.attachments ?? [];
  const isAuthor = result.viewerId === result.post?.author_id;
  return (
    <main className="mx-auto max-w-[var(--reading-max-width)] px-[var(--page-padding)] py-16">
      <h1>{result.post?.title}</h1>
      <section aria-label="첨부 파일" className="mt-6">
        <h2 className="text-lg font-semibold">첨부 파일</h2>
        {isAuthor ? <form action={uploadPostAttachmentAction} className="mt-2 space-y-2" encType="multipart/form-data">
          <input name="post_id" type="hidden" value={postId} />
          <label className="block text-sm font-medium">
            첨부 파일
            <input
              accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
              className="mt-2 block min-h-11 w-full text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
              multiple
              name="files"
              required
              type="file"
            />
          </label>
          <button className="min-h-11 border border-[var(--border)] px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2" type="submit">
            첨부 업로드
          </button>
        </form> : null}
        {attachments.length ? (
          <ul className="mt-3 space-y-2">
            {attachments.map((attachment) => (
              <li className="flex flex-wrap items-center gap-2" key={attachment.id}>
                <span>{attachment.original_filename} ({attachment.size_bytes} bytes)</span>
                <form action={downloadPostAttachmentAction}>
                  <input name="attachment_id" type="hidden" value={attachment.id} />
                  <button className="min-h-11 px-2 text-sm underline focus-visible:outline-2 focus-visible:outline-offset-2" type="submit">
                    {attachment.original_filename} 다운로드
                  </button>
                </form>
                {isAuthor ? <form action={deletePostAttachmentAction}>
                  <input name="attachment_id" type="hidden" value={attachment.id} />
                  <input name="post_id" type="hidden" value={postId} />
                  <button className="min-h-11 px-2 text-sm underline focus-visible:outline-2 focus-visible:outline-offset-2" type="submit">
                    첨부 삭제
                  </button>
                </form> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">첨부 파일이 없습니다.</p>
        )}
      </section>
      <section aria-label="댓글" className="mt-8">
        {result.comments.length ? result.comments.map((comment) => <p key={comment.id}>{comment.body}</p>) : <p>아직 댓글이 없습니다.</p>}
      </section>
    </main>
  );
}

export default async function PostPage({ params }: { params: Promise<{ postId: string }> }) {
  return renderPostPage(params);
}
