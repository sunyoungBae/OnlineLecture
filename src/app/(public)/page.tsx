import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-[var(--content-max-width)] px-[var(--page-padding)] py-16">
      <section className="max-w-[var(--reading-max-width)]">
        <p className="text-sm font-medium text-[var(--muted-foreground)]">ONLINE LECTURE</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">온라인 강의</h1>
        <p className="mt-6 text-lg leading-8 text-[var(--muted-foreground)]">
          강의와 대화를 통해 천천히 배우는 시간을 만듭니다.
        </p>
        <Link
          className="mt-8 inline-flex min-h-11 items-center bg-[var(--foreground)] px-5 text-sm font-semibold text-[var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-2"
          href="/login"
        >
          Google로 로그인
        </Link>
      </section>

      <section aria-labelledby="course-preview" className="mt-20 border-t border-[var(--border)] pt-8">
        <h2 className="text-2xl font-semibold" id="course-preview">
          강의 미리보기
        </h2>
        <p className="mt-4 text-[var(--muted-foreground)]">
          로그인 후 여러 강의와 회차별 영상을 이용할 수 있습니다.
        </p>
      </section>

      <section aria-labelledby="recent-updates" className="mt-12 border-t border-[var(--border)] pt-8">
        <h2 className="text-2xl font-semibold" id="recent-updates">
          최근 소식
        </h2>
        <p className="mt-4 text-[var(--muted-foreground)]">
          공지와 게시글은 준비되는 대로 이곳에서 확인할 수 있습니다.
        </p>
      </section>
    </main>
  );
}
