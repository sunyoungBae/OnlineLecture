import Link from "next/link";
import { notFound } from "next/navigation";
import { createLesson, deleteLesson, moveLesson, updateLesson } from "./actions";
import { requirePageRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

export default async function LessonAdminPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  await requirePageRole("admin", { nextPath: `/admin/courses/${courseId}/lessons` });
  const client = await createClient();
  const { data: course, error: courseError } = await client.from("courses").select("id, title").eq("id", courseId).maybeSingle();
  if (courseError) return <main className="py-10"><p role="alert">강의를 불러오지 못했습니다.</p></main>;
  if (!course) notFound();
  const { data: lessons, error } = await client.from("lessons").select("id, title, description, position, youtube_video_id").eq("course_id", course.id).order("position", { ascending: true });
  if (error) return <main className="py-10"><p role="alert">회차를 불러오지 못했습니다.</p></main>;
  return <main className="py-10"><Link href="/admin/courses">강의 관리로</Link><h2 className="mt-4 text-3xl font-semibold">{course.title} 회차 관리</h2><form action={createLesson} className="mt-8 space-y-3"><input name="course_id" type="hidden" value={course.id}/><input name="position" type="hidden" value={(lessons?.length ?? 0) + 1}/><label>제목<input name="title" required /></label><label>YouTube URL<input name="youtube_url" required type="url" /></label><label>설명<textarea name="description" /></label><button type="submit">회차 추가</button></form><ol className="mt-10 space-y-8">{(lessons ?? []).map((lesson, index) => <li key={lesson.id} className="border-t pt-4"><form action={updateLesson} className="space-y-3"><input name="course_id" type="hidden" value={course.id}/><input name="lesson_id" type="hidden" value={lesson.id}/><label>제목<input defaultValue={lesson.title} name="title" required /></label><label>YouTube URL<input defaultValue={`https://youtu.be/${lesson.youtube_video_id}`} name="youtube_url" required type="url" /></label><label>설명<textarea defaultValue={lesson.description} name="description" /></label><button type="submit">수정</button></form><div className="mt-3 flex gap-2"><MoveForm courseId={course.id} disabled={index === 0} direction="up" lessonId={lesson.id}/><MoveForm courseId={course.id} disabled={index === (lessons?.length ?? 0) - 1} direction="down" lessonId={lesson.id}/><form action={deleteLesson}><input name="course_id" type="hidden" value={course.id}/><input name="lesson_id" type="hidden" value={lesson.id}/><button type="submit">삭제</button></form></div></li>)}</ol></main>;
}
function MoveForm({ courseId, direction, disabled, lessonId }: { courseId: string; direction: "up" | "down"; disabled: boolean; lessonId: string }) { return <form action={moveLesson}><input name="course_id" type="hidden" value={courseId}/><input name="lesson_id" type="hidden" value={lessonId}/><input name="direction" type="hidden" value={direction}/><button disabled={disabled} type="submit">{direction === "up" ? "위로" : "아래로"}</button></form>; }
