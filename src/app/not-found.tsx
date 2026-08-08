import { EmptyState } from "../components/states/empty-state";

export default function NotFoundPage() {
  return (
    <main className="mx-auto max-w-[var(--reading-max-width)] px-[var(--page-padding)] py-16">
      <EmptyState
        action={{ href: "/", label: "처음으로" }}
        description="주소가 변경되었거나 존재하지 않는 페이지입니다."
        headingLevel="h1"
        title="요청한 페이지를 찾을 수 없습니다"
      />
    </main>
  );
}
