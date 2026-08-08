import Link from "next/link";
import { notFound } from "next/navigation";
import { createLesson, deleteLesson, moveLesson, updateLesson } from "./actions";
import { requirePageRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

export function lessonFeedback({ error, notice }: { error?: string; notice?: string }) {
  if (notice === "lesson-moved") return { role: "status" as const, text: "회차 순서를 변경했습니다." };
  if (notice === "lesson-created") return { role: "status" as const, text: "회차를 추가했습니다." };
  if (notice === "lesson-updated") return { role: "status" as const, text: "회차를 수정했습니다." };
  if (notice === "lesson-deleted") return { role: "status" as const, text: "회차를 삭제했습니다." };
  if (error === "forbidden") return { role: "alert" as const, text: "이 작업을 수행할 권한이 없습니다." };
  if (error === "invalid") return { role: "alert" as const, text: "입력값을 확인해 주세요." };
  if (error === "boundary") return { role: "alert" as const, text: "더 이상 이동할 수 없는 회차입니다." };
  if (error === "save") return { role: "alert" as const, text: "회차를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  return null;
}

export default async function LessonAdminPage({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { courseId } = await params;
  const feedback = lessonFeedback(await searchParams);
  await requirePageRole("admin", { nextPath: `/admin/courses/${courseId}/lessons` });
  const client = await createClient();
  const { data: course, error: courseError } = await client.from("courses").select("id, title").eq("id", courseId).maybeSingle();
  if (courseError) return <main className="py-10"><p role="alert">강의를 불러오지 못했습니다.</p></main>;
  if (!course) notFound();
  const { data: lessons, error } = await client.from("lessons").select("id, title, description, position, youtube_video_id").eq("course_id", course.id).order("position", { ascending: true });
  if (error) return <main className="py-10"><p role="alert">회차를 불러오지 못했습니다.</p></main>;
  return <main className="py-10"><Link href="/admin/courses">강의 관리로</Link><h2 className="mt-4 text-3xl font-semibold">{course.title} 회차 관리</h2>{feedback ? <p role={feedback.role}>{feedback.text}</p> : null}<form action={createLesson} className="mt-8 space-y-3"><input name="course_id" type="hidden" value={course.id}/><input name="position" type="hidden" value={(lessons?.length ?? 0) + 1}/><label>제목<input name="title" required /></label><label>YouTube URL<input name="youtube_url" required type="url" /></label><label>설명<textarea name="description" /></label><button type="submit">회차 추가</button></form><ol className="mt-10 space-y-8">{(lessons ?? []).map((lesson, index) => <li key={lesson.id} className="border-t pt-4"><form action={updateLesson} className="space-y-3"><input name="course_id" type="hidden" value={course.id}/><input name="lesson_id" type="hidden" value={lesson.id}/><label>제목<input defaultValue={lesson.title} name="title" required /></label><label>YouTube URL<input defaultValue={`https://youtu.be/${lesson.youtube_video_id}`} name="youtube_url" required type="url" /></label><label>설명<textarea defaultValue={lesson.description} name="description" /></label><button type="submit">수정</button></form><div className="mt-3 flex gap-2"><MoveForm courseId={course.id} disabled={index === 0} direction="up" lessonId={lesson.id}/><MoveForm courseId={course.id} disabled={index === (lessons?.length ?? 0) - 1} direction="down" lessonId={lesson.id}/><form action={deleteLesson}><input name="course_id" type="hidden" value={course.id}/><input name="lesson_id" type="hidden" value={lesson.id}/><button type="submit">삭제</button></form></div></li>)}</ol></main>;
}
function MoveForm({ courseId, direction, disabled, lessonId }: { courseId: string; direction: "up" | "down"; disabled: boolean; lessonId: string }) { return <form action={moveLesson}><input name="course_id" type="hidden" value={courseId}/><input name="lesson_id" type="hidden" value={lessonId}/><input name="direction" type="hidden" value={direction}/><button disabled={disabled} type="submit">{direction === "up" ? "위로" : "아래로"}</button></form>; }
