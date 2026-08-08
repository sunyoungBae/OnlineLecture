import { deleteCourse, createCourse, updateCourse } from "./actions";
import Link from "next/link";
import { EmptyState } from "../../../components/states/empty-state";
import { Forbidden } from "../../../components/states/forbidden";
import { requirePageRole } from "../../../lib/auth/require-role";
import { createClient } from "../../../lib/supabase/server";

type Course = {
  description: string;
  id: string;
  is_published: boolean;
  slug: string;
  title: string;
};

type CourseQueryResult = { data: Course[] | null; error: unknown };

export type AdminCoursesPageClient = {
  from: (table: "courses") => {
    select: (columns: "id, title, slug, description, is_published") => {
      order: (column: "title", options: { ascending: boolean }) => PromiseLike<CourseQueryResult>;
    };
  };
};

type AdminCoursesPageClientFactory = () => Promise<AdminCoursesPageClient>;
type PageSearchParams = Promise<{ error?: string; notice?: string }>;

const noticeMessages = {
  created: "강의를 만들었습니다.",
  deleted: "강의를 삭제했습니다.",
  updated: "강의를 수정했습니다.",
} as const;

const errorMessages = {
  forbidden: "이 작업을 수행할 권한이 없습니다.",
  invalid: "입력값을 확인해 주세요.",
  save: "강의를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
} as const;

export async function loadAdminCourses(
  clientFactory: AdminCoursesPageClientFactory = defaultPageClientFactory,
) {
  await requirePageRole("admin", { nextPath: "/admin/courses" });

  try {
    const client = await clientFactory();
    const { data, error } = await client
      .from("courses")
      .select("id, title, slug, description, is_published")
      .order("title", { ascending: true });

    if (error) {
      return { courses: [], hasLoadError: true };
    }

    return { courses: data ?? [], hasLoadError: false };
  } catch {
    return { courses: [], hasLoadError: true };
  }
}

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const [{ courses, hasLoadError }, params] = await Promise.all([loadAdminCourses(), searchParams]);
  const notice = params.notice && params.notice in noticeMessages ? noticeMessages[params.notice as keyof typeof noticeMessages] : null;
  const isForbidden = params.error === "forbidden";
  const error = !isForbidden && params.error && params.error in errorMessages ? errorMessages[params.error as keyof typeof errorMessages] : null;

  if (isForbidden) {
    return (
      <main className="py-10">
        <Forbidden action={{ href: "/", label: "처음으로" }} />
      </main>
    );
  }

  if (hasLoadError) {
    return (
      <main className="py-10">
        <EmptyState
          action={{ href: "/admin/courses", label: "강의 목록 새로고침" }}
          description="잠시 후 다시 시도해 주세요."
          role="alert"
          title="강의 목록을 불러오지 못했습니다"
        />
      </main>
    );
  }

  return (
    <main className="py-10">
      <div className="max-w-[var(--reading-max-width)]">
        <h2 className="text-3xl font-semibold tracking-tight">강의 관리</h2>
        <p className="mt-4 text-muted-foreground">강의 정보와 공개 여부를 관리합니다.</p>

        {notice ? <p className="mt-6 text-sm text-success" role="status">{notice}</p> : null}
        {error ? <p className="mt-6 text-sm text-destructive" role="alert">{error}</p> : null}
        <section aria-labelledby="create-course-heading" className="mt-10 border-t border-border pt-8">
          <h3 className="text-2xl font-semibold" id="create-course-heading">새 강의</h3>
          <CourseForm action={createCourse} submitLabel="강의 만들기" />
        </section>

        <section aria-labelledby="course-list-heading" className="mt-12 border-t border-border pt-8">
          <h3 className="text-2xl font-semibold" id="course-list-heading">등록된 강의</h3>
          {courses.length === 0 ? (
            <EmptyState description="새 강의를 만들면 이 목록에서 공개 상태와 회차를 관리할 수 있습니다." headingLevel="h4" title="아직 등록된 강의가 없습니다." />
          ) : (
            <ul className="mt-6 space-y-10">
              {courses.map((course) => (
                <li className="border-t border-border pt-6" key={course.id}>
                  <Link className="inline-flex min-h-11 items-center text-sm font-medium underline" href={`/admin/courses/${course.id}/lessons`}>
                    회차 관리
                  </Link>
                  <CourseForm action={updateCourse} course={course} submitLabel="강의 수정" />
                  <form action={deleteCourse} className="mt-4">
                    <input name="id" type="hidden" value={course.id} />
                    <button
                      className="min-h-11 rounded-sm border border-destructive bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/85"
                      type="submit"
                    >
                      강의 삭제
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function CourseForm({
  action,
  course,
  submitLabel,
}: {
  action: typeof createCourse | typeof updateCourse;
  course?: Course;
  submitLabel: string;
}) {
  const fieldPrefix = course ? `course-${course.id}` : "new-course";

  return (
    <form action={action} className="mt-6 space-y-5">
      {course ? <input name="id" type="hidden" value={course.id} /> : null}
      <div>
        <label className="block min-h-11 text-sm font-medium" htmlFor={`${fieldPrefix}-title`}>제목</label>
        <input
          defaultValue={course?.title}
          id={`${fieldPrefix}-title`}
          maxLength={120}
          name="title"
          required
          type="text"
        />
      </div>
      <div>
        <label className="block min-h-11 text-sm font-medium" htmlFor={`${fieldPrefix}-slug`}>주소</label>
        <input
          aria-describedby={`${fieldPrefix}-slug-help`}
          defaultValue={course?.slug}
          id={`${fieldPrefix}-slug`}
          maxLength={80}
          name="slug"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          required
          type="text"
        />
        <p className="mt-1 text-sm text-muted-foreground" id={`${fieldPrefix}-slug-help`}>
          영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.
        </p>
      </div>
      <div>
        <label className="block min-h-11 text-sm font-medium" htmlFor={`${fieldPrefix}-description`}>소개</label>
        <textarea
          defaultValue={course?.description}
          id={`${fieldPrefix}-description`}
          maxLength={2000}
          name="description"
        />
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm font-medium" htmlFor={`${fieldPrefix}-published`}>
        <input defaultChecked={course?.is_published} id={`${fieldPrefix}-published`} name="is_published" type="checkbox" />
        공개
      </label>
      <button className="min-h-11 rounded-sm border border-transparent bg-accent px-4 py-2 text-sm font-medium hover:bg-accent/85" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}

function defaultPageClientFactory() {
  return createClient() as unknown as Promise<AdminCoursesPageClient>;
}
