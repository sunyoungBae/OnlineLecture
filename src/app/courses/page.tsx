import Link from "next/link";

import { parseYouTubeUrl } from "@/features/courses/youtube";
import { requirePageRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

type CoursePreview = {
  courseId: string;
  thumbnailUrl: string | null;
};

export default async function CoursesPage() {
  await requirePageRole("member", { nextPath: "/courses" });
  const supabase = await createClient();
  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select("id, title, slug, description")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (coursesError) {
    return <CoursesError />;
  }

  if (!courses?.length) {
    return <CoursesEmpty />;
  }

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("course_id, position, youtube_video_id")
    .in(
      "course_id",
      courses.map((course) => course.id),
    )
    .order("position", { ascending: true });

  if (lessonsError) {
    return <CoursesError />;
  }

  const previewByCourseId = new Map<string, CoursePreview>();
  for (const lesson of lessons ?? []) {
    if (previewByCourseId.has(lesson.course_id)) {
      continue;
    }

    previewByCourseId.set(lesson.course_id, {
      courseId: lesson.course_id,
      thumbnailUrl: parseYouTubeUrl(`https://youtu.be/${lesson.youtube_video_id}`)?.thumbnailUrl ?? null,
    });
  }

  return (
    <main className="mx-auto max-w-[var(--content-max-width)] px-[var(--page-padding)] py-12 md:py-16">
      <header className="max-w-[var(--reading-max-width)] border-b border-[var(--border)] pb-8">
        <p className="text-sm font-medium text-[var(--muted-foreground)]">MEMBER COURSES</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">강의</h1>
        <p className="mt-4 text-[var(--muted-foreground)]">공개된 강의를 선택해 회차별 영상을 시청하세요.</p>
      </header>

      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => {
          const thumbnailUrl = previewByCourseId.get(course.id)?.thumbnailUrl;

          return (
            <li className="border border-[var(--border)] bg-[var(--surface)]" key={course.id}>
              {thumbnailUrl ? (
                <img
                  alt=""
                  className="aspect-video w-full border-b border-[var(--border)] object-cover"
                  src={thumbnailUrl}
                />
              ) : (
                <div
                  aria-label="아직 회차가 등록되지 않았습니다"
                  className="aspect-video border-b border-[var(--border)] bg-[var(--background)]"
                  role="img"
                />
              )}
              <div className="p-5">
                <h2 className="text-2xl font-semibold">
                  <Link
                    className="focus-visible:outline-2 focus-visible:outline-offset-4 hover:underline"
                    href={`/courses/${course.slug}`}
                  >
                    {course.title}
                  </Link>
                </h2>
                {course.description ? (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--muted-foreground)]">
                    {course.description}
                  </p>
                ) : null}
                <Link
                  className="mt-5 inline-flex min-h-11 items-center border-b border-[var(--foreground)] text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4"
                  href={`/courses/${course.slug}`}
                >
                  강의 보기
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function CoursesEmpty() {
  return (
    <main className="mx-auto max-w-[var(--reading-max-width)] px-[var(--page-padding)] py-16">
      <h1 className="text-4xl font-semibold tracking-tight">강의</h1>
      <p className="mt-6 text-[var(--muted-foreground)]">현재 공개된 강의가 없습니다. 새 강의가 등록되면 이곳에서 확인할 수 있습니다.</p>
    </main>
  );
}

function CoursesError() {
  return (
    <main className="mx-auto max-w-[var(--reading-max-width)] px-[var(--page-padding)] py-16">
      <h1 className="text-4xl font-semibold tracking-tight">강의를 불러오지 못했습니다</h1>
      <p className="mt-6 text-[var(--muted-foreground)]">잠시 후 다시 시도해 주세요.</p>
    </main>
  );
}
