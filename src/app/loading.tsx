import { EmptyState } from "../components/states/empty-state";

export default function LoadingPage() {
  return (
    <main aria-busy="true" className="mx-auto max-w-[var(--reading-max-width)] px-[var(--page-padding)] py-16">
      <EmptyState description="잠시만 기다려 주세요." headingLevel="h1" title="페이지를 불러오는 중입니다" />
    </main>
  );
}
