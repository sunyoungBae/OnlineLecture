import { describe, expect, it, vi } from "vitest";

import ErrorPage from "../../app/error";
import LoadingPage from "../../app/loading";
import NotFoundPage from "../../app/not-found";
import { EmptyState } from "./empty-state";
import { Forbidden } from "./forbidden";

type Element = { props?: { children?: unknown; className?: string; role?: string; href?: string; onClick?: unknown }; type?: unknown };

function textContent(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (!node || typeof node !== "object") return "";
  const element = node as Element;
  if (typeof element.type === "function") return textContent(element.type(element.props ?? {}));
  return textContent(element.props?.children);
}

function elements(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object") return [];
  const element = node as Element;
  const rendered = typeof element.type === "function" ? element.type(element.props ?? {}) : element.props?.children;
  return [element, ...elements(rendered)];
}

describe("공통 상태 화면", () => {
  it("빈 상태는 한국어 안내와 44px 복구 링크를 status로 제공한다", () => {
    const page = EmptyState({
      action: { href: "/courses", label: "강의 목록으로" },
      description: "새 강의가 등록되면 이곳에서 확인할 수 있습니다.",
      title: "현재 공개된 강의가 없습니다",
    });

    expect(textContent(page)).toContain("현재 공개된 강의가 없습니다");
    expect(elements(page).some((element) => element.props?.role === "status")).toBe(true);
    expect(elements(page).some((element) => element.props?.href === "/courses" && element.props.className?.includes("min-h-11") && element.props.className?.includes("focus-visible:outline-2"))).toBe(true);
  });

  it("권한 없음은 존재 정보를 숨기고 alert와 복구 링크를 제공한다", () => {
    const page = Forbidden({ action: { href: "/", label: "처음으로" } });

    expect(textContent(page)).toContain("이 페이지에 접근할 권한이 없습니다");
    expect(textContent(page)).not.toContain("관리자");
    expect(elements(page).some((element) => element.props?.role === "alert")).toBe(true);
    expect(elements(page).some((element) => element.props?.href === "/")).toBe(true);
  });

  it("404와 로딩은 한국어 상태를, 오류는 재시도 버튼을 제공한다", () => {
    const retry = vi.fn();
    const notFound = NotFoundPage();
    const loading = LoadingPage();
    const error = ErrorPage({ error: new Error("database secret"), reset: retry });

    expect(textContent(notFound)).toContain("요청한 페이지를 찾을 수 없습니다");
    expect(textContent(loading)).toContain("페이지를 불러오는 중입니다");
    expect(elements(loading).some((element) => element.props?.role === "status")).toBe(true);
    const retryButton = elements(error).find((element) => element.type === "button" && textContent(element) === "다시 시도");
    expect(textContent(error)).not.toContain("database secret");
    expect(retryButton?.props?.className).toContain("min-h-11");
    expect(retryButton?.props?.className).toContain("focus-visible:outline-2");
  });
});
