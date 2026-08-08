"use server";

import { redirect } from "next/navigation";

import { parseYouTubeUrl } from "@/features/courses/youtube";
import { AuthorizationError, requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

type FormDataLike = { get(name: string): unknown };
type Direction = "up" | "down";
type MutationResult = { error: unknown };
type AffectedRowResult = { data: { id: string } | null; error: unknown };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type LessonMutationClient = {
  rpc: (name: "move_lesson", args: { p_direction: Direction; p_lesson_id: string }) => Promise<{ data: boolean | null; error: unknown }>;
  from: (table: "lessons") => {
    delete: () => { eq: (column: "id", value: string) => { select: (columns: "id") => { maybeSingle: () => PromiseLike<AffectedRowResult> } } };
    insert: (values: { course_id: string; description: string; position: number; title: string; youtube_video_id: string }) => PromiseLike<MutationResult>;
    update: (values: { description: string; title: string; youtube_video_id: string }) => { eq: (column: "id", value: string) => { select: (columns: "id") => { maybeSingle: () => PromiseLike<AffectedRowResult> } } };
  };
};

type ClientFactory = () => Promise<LessonMutationClient>;
function value(formData: FormDataLike, name: string) { const item = formData.get(name); return typeof item === "string" ? item.trim() : ""; }
function validId(value: string) { return uuid.test(value); }
function path(formData: FormDataLike) { const courseId = value(formData, "course_id"); return validId(courseId) ? `/admin/courses/${courseId}/lessons` : "/admin/courses"; }
async function admin() { try { await requireRole("admin"); return true; } catch (error) { if (error instanceof AuthorizationError) return false; throw error; } }
function finish(formData: FormDataLike, query: string): never { return redirect(`${path(formData)}?${query}`); }
function lessonValues(formData: FormDataLike) {
  const title = value(formData, "title"); const description = value(formData, "description"); const video = parseYouTubeUrl(value(formData, "youtube_url"));
  return title && title.length <= 120 && description.length <= 2000 && video ? { description, title, youtube_video_id: video.id } : null;
}

export async function moveLesson(formData: FormDataLike, clientFactory: ClientFactory = defaultClientFactory) {
  if (!(await admin())) return finish(formData, "error=forbidden");
  const lessonId = value(formData, "lesson_id"); const direction = value(formData, "direction");
  if (!validId(lessonId) || (direction !== "up" && direction !== "down")) return finish(formData, "error=invalid");
  try { const result = await (await clientFactory()).rpc("move_lesson", { p_direction: direction, p_lesson_id: lessonId }); if (result.error) return finish(formData, "error=save"); return finish(formData, result.data ? "notice=lesson-moved" : "error=boundary"); } catch { return finish(formData, "error=save"); }
}

export async function createLesson(formData: FormDataLike, clientFactory: ClientFactory = defaultClientFactory) {
  if (!(await admin())) return finish(formData, "error=forbidden");
  const courseId = value(formData, "course_id"); const position = Number(value(formData, "position")); const lesson = lessonValues(formData);
  if (!validId(courseId) || !Number.isInteger(position) || position < 1 || !lesson) return finish(formData, "error=invalid");
  try { const { error } = await (await clientFactory()).from("lessons").insert({ ...lesson, course_id: courseId, position }); return finish(formData, error ? "error=save" : "notice=lesson-created"); } catch { return finish(formData, "error=save"); }
}

export async function updateLesson(formData: FormDataLike, clientFactory: ClientFactory = defaultClientFactory) {
  if (!(await admin())) return finish(formData, "error=forbidden");
  const lessonId = value(formData, "lesson_id"); const lesson = lessonValues(formData);
  if (!validId(lessonId) || !lesson) return finish(formData, "error=invalid");
  try { const { data, error } = await (await clientFactory()).from("lessons").update(lesson).eq("id", lessonId).select("id").maybeSingle(); return finish(formData, error || !data ? "error=save" : "notice=lesson-updated"); } catch { return finish(formData, "error=save"); }
}

export async function deleteLesson(formData: FormDataLike, clientFactory: ClientFactory = defaultClientFactory) {
  if (!(await admin())) return finish(formData, "error=forbidden");
  const lessonId = value(formData, "lesson_id"); if (!validId(lessonId)) return finish(formData, "error=invalid");
  try { const { data, error } = await (await clientFactory()).from("lessons").delete().eq("id", lessonId).select("id").maybeSingle(); return finish(formData, error || !data ? "error=save" : "notice=lesson-deleted"); } catch { return finish(formData, "error=save"); }
}

function defaultClientFactory() { return createClient() as unknown as Promise<LessonMutationClient>; }
