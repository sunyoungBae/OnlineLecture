export default function LoginPage() {
  return (
    <main className="mx-auto max-w-[var(--reading-max-width)] px-[var(--page-padding)] py-16">
      <h1 className="text-4xl font-semibold tracking-tight">로그인</h1>
      <p className="mt-6 text-[var(--muted-foreground)]">
        Google 계정으로 로그인해 강의와 커뮤니티를 이용하세요.
      </p>
      <button
        className="mt-8 min-h-11 border border-[var(--foreground)] bg-[var(--surface)] px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
        type="button"
      >
        Google로 계속하기
      </button>
    </main>
  );
}
