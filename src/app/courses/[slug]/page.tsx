import Link from "next/link";
import { notFound } from "next/navigation";

import { parseYouTubeUrl } from "@/features/courses/youtube";
import { requirePageRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

type CoursePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CourseDetailPage({ params }: CoursePageProps) {
  const { slug } = await params;
  await requirePageRole("member", { nextPath: `/courses/${slug}` });

  const supabase = await createClient();
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, title, description")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (courseError) {
    return <CourseError />;
  }

  if (!course) {
    notFound();
  }

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("id, title, description, position, youtube_video_id")
    .eq("course_id", course.id)
    .order("position", { ascending: true });

  if (lessonsError) {
    return <CourseError />;
  }

  return (
    <main className="mx-auto max-w-[var(--content-max-width)] px-[var(--page-padding)] py-12 md:py-16">
      <Link
        className="inline-flex min-h-11 items-center text-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
        href="/courses"
      >
        강의 목록으로
      </Link>
      <header className="mt-4 max-w-[var(--reading-max-width)] border-b border-[var(--border)] pb-8">
        <p className="text-sm font-medium text-[var(--muted-foreground)]">COURSE</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{course.title}</h1>
        {course.description ? (
          <p className="mt-4 whitespace-pre-wrap leading-7 text-[var(--muted-foreground)]">{course.description}</p>
        ) : null}
      </header>

      {!lessons?.length ? (
        <section className="mt-8 max-w-[var(--reading-max-width)] border border-[var(--border)] bg-[var(--surface)] p-6" aria-labelledby="empty-lessons-title">
          <h2 className="text-2xl font-semibold" id="empty-lessons-title">등록된 회차가 없습니다</h2>
          <p className="mt-3 text-[var(--muted-foreground)]">회차가 등록되면 이 강의에서 영상을 시청할 수 있습니다.</p>
        </section>
      ) : (
        <ol className="mt-8 grid gap-8">
          {lessons.map((lesson) => {
            const video = parseYouTubeUrl(`https://youtu.be/${lesson.youtube_video_id}`);

            return (
              <li className="max-w-[var(--reading-max-width)] border-b border-[var(--border)] pb-8" key={lesson.id}>
                <p className="text-sm font-medium text-[var(--muted-foreground)]">{lesson.position}회차</p>
                <h2 className="mt-2 text-2xl font-semibold">{lesson.title}</h2>
                {lesson.description ? (
                  <p className="mt-3 whitespace-pre-wrap leading-7 text-[var(--muted-foreground)]">{lesson.description}</p>
                ) : null}
                {video ? (
                  <div className="mt-5 aspect-video overflow-hidden border border-[var(--border)] bg-[var(--foreground)]">
                    <iframe
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="h-full w-full"
                      referrerPolicy="strict-origin-when-cross-origin"
                      src={`https://www.youtube-nocookie.com/embed/${video.id}`}
                      title={`${lesson.title} 영상`}
                    />
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-[var(--destructive)]" role="alert">
                    이 회차의 영상을 재생할 수 없습니다.
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}

function CourseError() {
  return (
    <main className="mx-auto max-w-[var(--reading-max-width)] px-[var(--page-padding)] py-16">
      <h1 className="text-4xl font-semibold tracking-tight">강의를 불러오지 못했습니다</h1>
      <p className="mt-6 text-[var(--muted-foreground)]">잠시 후 다시 시도해 주세요.</p>
    </main>
  );
}
