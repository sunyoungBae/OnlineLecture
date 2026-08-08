import { redirect as nextRedirect } from "next/navigation";

import { requirePageRole } from "../../lib/auth/require-role";
import { createClient as createSupabaseClient } from "../../lib/supabase/server";

type FormDataLike = { get: (name: string) => unknown };
type State = { status?: "error"; message?: string };
const editPath = (postId: string) => `/board/${encodeURIComponent(postId)}`;

export type CommentDependencies = {
  createClient: () => Promise<{ from: (table: "comments") => { insert: (v: { author_id: string; body: string; post_id: string }) => Promise<{ error: unknown }>; update: (v: { body: string }) => { eq: (c: "id", v: string) => { eq: (c: "author_id", v: string) => { select: (c: "id") => Promise<{ data: { id: string }[] | null; error: unknown }> } } }; delete: () => { eq: (c: "id", v: string) => { eq: (c: "author_id", v: string) => { select: (c: "id") => Promise<{ data: { id: string }[] | null; error: unknown }> } } } } }>;
  redirect: (path: string) => never;
  requirePageRole: (role: "member", options: { nextPath: string }) => Promise<{ id: string; role: "member" | "admin" }>;
};
const defaults: CommentDependencies = { createClient: async () => (await createSupabaseClient()) as unknown as Awaited<ReturnType<CommentDependencies["createClient"]>>, redirect: nextRedirect, requirePageRole };
function bodyOf(form: FormDataLike) { const body = form.get("body"); return typeof body === "string" && Array.from(body.trim()).length >= 1 && Array.from(body).length <= 2000 ? body.trim() : null; }
export function createCommentAction(postId: string, deps = defaults) { return async (_: State, form: FormDataLike): Promise<State> => { "use server"; const profile = await deps.requirePageRole("member", { nextPath: editPath(postId) }); const body = bodyOf(form); if (!body) return { status: "error", message: "댓글은 1자 이상 2,000자 이하여야 합니다." }; try { const { error } = await (await deps.createClient()).from("comments").insert({ author_id: profile.id, body, post_id: postId }); if (error) return { status: "error", message: "댓글을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }; } catch { return { status: "error", message: "댓글을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }; } return deps.redirect(editPath(postId)); }; }
export function updateCommentAction(postId: string, commentId: string, deps = defaults) { return async (_: State, form: FormDataLike): Promise<State> => { "use server"; const profile = await deps.requirePageRole("member", { nextPath: editPath(postId) }); const body = bodyOf(form); if (!body) return { status: "error", message: "댓글은 1자 이상 2,000자 이하여야 합니다." }; try { const { data, error } = await (await deps.createClient()).from("comments").update({ body }).eq("id", commentId).eq("author_id", profile.id).select("id"); if (error || !data?.length) return { status: "error", message: "댓글을 수정하지 못했습니다. 잠시 후 다시 시도해 주세요." }; } catch { return { status: "error", message: "댓글을 수정하지 못했습니다. 잠시 후 다시 시도해 주세요." }; } return deps.redirect(editPath(postId)); }; }
export function deleteCommentAction(postId: string, commentId: string, deps = defaults) { return async (): Promise<State> => { "use server"; const profile = await deps.requirePageRole("member", { nextPath: editPath(postId) }); try { const { data, error } = await (await deps.createClient()).from("comments").delete().eq("id", commentId).eq("author_id", profile.id).select("id"); if (error || !data?.length) return { status: "error", message: "댓글을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." }; } catch { return { status: "error", message: "댓글을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." }; } return deps.redirect(editPath(postId)); }; }
