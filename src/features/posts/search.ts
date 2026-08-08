import { z } from "zod";

export const MAX_POST_SEARCH_PAGE = 10_000;

const searchParamsSchema = z.object({
  course: z.string().regex(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i).optional(),
  page: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .refine((value) => Number.isSafeInteger(value) && value <= MAX_POST_SEARCH_PAGE)
    .optional(),
  q: z.string().trim().min(1).max(120).optional(),
});

export type PostSearchParams = {
  courseId: string | null;
  page: number;
  query: string | null;
};

export function escapeIlikePattern(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

export function buildPostSearchFilter(query: string) {
  const pattern = `%${escapeIlikePattern(query)}%`;
  return `title.ilike.${pattern},search_text.ilike.${pattern}`;
}

export function parsePostSearchParams(input: Record<string, unknown>): PostSearchParams {
  const parsed = searchParamsSchema.safeParse(input);
  if (!parsed.success) {
    return { courseId: null, page: 1, query: null };
  }

  return {
    courseId: parsed.data.course ?? null,
    page: parsed.data.page ?? 1,
    query: parsed.data.q ?? null,
  };
}
