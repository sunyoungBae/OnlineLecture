import { EmptyState, type StateAction } from "./empty-state";

type ForbiddenProps = {
  action?: StateAction;
};

export function Forbidden({ action = { href: "/", label: "처음으로" } }: ForbiddenProps) {
  return (
    <EmptyState
      action={action}
      description="로그인 상태 또는 접근 권한을 확인한 뒤 다시 시도해 주세요."
      role="alert"
      title="이 페이지에 접근할 권한이 없습니다"
    />
  );
}
