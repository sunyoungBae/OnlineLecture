import Link from "next/link";

import { EmptyState } from "../../components/states/empty-state";
import {
  buildPostSearchFilter,
  parsePostSearchParams,
  type PostSearchParams,
} from "../../features/posts/search";
import { createClient } from "../../lib/supabase/server";

const POSTS_PER_PAGE = 20;

type PublicPost = {
  author_id: string;
  course_id: string | null;
  created_at: string;
  id: string;
  is_notice: boolean;
  search_text: string;
  title: string;
};

type PostQueryResult = {
  count: number | null;
  data: PublicPost[] | null;
  error: unknown;
};

type PostQuery = {
  eq: (column: "course_id", value: string) => PostQuery;
  or: (filters: string) => PostQuery;
  order: (column: "is_notice" | "created_at", options: { ascending: boolean }) => PostQuery;
  range: (from: number, to: number) => Promise<PostQueryResult>;
};

export type BoardPageClient = {
  from: (table: "posts") => {
    select: (columns: string, options: { count: "exact" }) => PostQuery;
  };
};

type BoardPageClientFactory = () => Promise<BoardPageClient>;
type BoardSearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function loadPublicPosts(
  params: PostSearchParams,
  clientFactory: BoardPageClientFactory = defaultPageClientFactory,
) {
  try {
    const client = await clientFactory();
    let query = client
      .from("posts")
      .select("id, author_id, title, search_text, created_at, is_notice, course_id", {
        count: "exact",
      })
      .order("is_notice", { ascending: false })
      .order("created_at", { ascending: false });

    if (params.query) {
      query = query.or(buildPostSearchFilter(params.query));
    }

    if (params.courseId) {
      query = query.eq("course_id", params.courseId);
    }

    const from = (params.page - 1) * POSTS_PER_PAGE;
    const { count, data, error } = await query.range(from, from + POSTS_PER_PAGE - 1);
    if (error) {
      return { hasLoadError: true, page: params.page, posts: [], total: 0 };
    }

    return {
      hasLoadError: false,
      page: params.page,
      posts: data ?? [],
      total: count ?? 0,
    };
  } catch {
    return { hasLoadError: true, page: params.page, posts: [], total: 0 };
  }
}

function boardHref(params: PostSearchParams, page: number) {
  const search = new globalThis.URLSearchParams();
  if (params.query) {
    search.set("q", params.query);
  }
  if (params.courseId) {
    search.set("course", params.courseId);
  }
  if (page > 1) {
    search.set("page", String(page));
  }

  const query = search.toString();
  return query ? `/board?${query}` : "/board";
}

export async function renderBoardPage(
  searchParams: BoardSearchParams,
  clientFactory: BoardPageClientFactory = defaultPageClientFactory,
) {
  const params = parsePostSearchParams(await searchParams);
  const { hasLoadError, page, posts, total } = await loadPublicPosts(params, clientFactory);
  const totalPages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));

  return (
    <main className="mx-auto max-w-[var(--reading-max-width)] px-[var(--page-padding)] py-16">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-noto-serif-kr)] text-4xl font-semibold tracking-tight">
            게시판
          </h1>
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            강의와 커뮤니티 이야기를 나눕니다.
          </p>
        </div>
        <Link
          className="flex min-h-11 items-center border border-[var(--foreground)] px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
          href="/board/new"
        >
          글쓰기
        </Link>
      </div>

      <form className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto_auto]" method="get">
        <label className="text-sm font-medium" htmlFor="board-search">
          게시글 검색
          <input
            className="mt-2 min-h-11 w-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
            defaultValue={params.query ?? ""}
            id="board-search"
            maxLength={120}
            name="q"
            type="search"
          />
        </label>
        <label className="text-sm font-medium" htmlFor="board-course">
          강의 ID 필터
          <input
            className="mt-2 min-h-11 w-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
            defaultValue={params.courseId ?? ""}
            id="board-course"
            name="course"
            type="text"
          />
        </label>
        <button
          className="mt-6 min-h-11 border border-transparent bg-[var(--accent)] px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
          type="submit"
        >
          검색
        </button>
      </form>

      {hasLoadError ? (
        <div className="mt-8">
          <EmptyState
            action={{ href: "/board", label: "목록 새로고침" }}
            description="잠시 후 다시 시도해 주세요."
            role="alert"
            title="게시글 목록을 불러오지 못했습니다"
          />
        </div>
      ) : null}

      {!hasLoadError && posts.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            action={{ href: "/board/new", label: "첫 게시글 작성하기" }}
            description="다른 수강생과 나누고 싶은 이야기를 첫 글로 남겨 보세요."
            title="아직 게시글이 없습니다."
          />
        </div>
      ) : null}

      {posts.length > 0 ? (
        <ul className="mt-8 divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                className="block min-h-11 py-5 focus-visible:outline-2 focus-visible:outline-offset-2"
                href={`/board/${encodeURIComponent(post.id)}`}
              >
                <p className="text-sm font-semibold">{post.is_notice ? "공지 · " : ""}{post.title}</p>
                <p className="mt-2 line-clamp-2 text-sm text-[var(--muted-foreground)]">{post.search_text}</p>
                <time className="mt-2 block text-xs text-[var(--muted-foreground)]" dateTime={post.created_at}>
                  {new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(post.created_at))}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {totalPages > 1 ? (
        <nav aria-label="게시글 페이지" className="mt-8 flex items-center gap-3">
          {page > 1 ? (
            <Link className="flex min-h-11 items-center border border-[var(--border)] px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2" href={boardHref(params, page - 1)}>
              이전
            </Link>
          ) : null}
          <span className="text-sm" aria-current="page">{page} / {totalPages}</span>
          {page < totalPages ? (
            <Link className="flex min-h-11 items-center border border-[var(--border)] px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2" href={boardHref(params, page + 1)}>
              다음
            </Link>
          ) : null}
        </nav>
      ) : null}
    </main>
  );
}

export default async function BoardPage({ searchParams }: { searchParams: BoardSearchParams }) {
  return renderBoardPage(searchParams);
}

function defaultPageClientFactory() {
  return createClient() as unknown as Promise<BoardPageClient>;
}
