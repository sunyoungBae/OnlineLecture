import { describe, expect, it } from "vitest";

import { postInputSchema, validatePostInput } from "./content";

const allowedContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "제목" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "굵게", marks: [{ type: "bold" }] },
        { type: "text", text: " 기울임", marks: [{ type: "italic" }] },
        { type: "text", text: " 취소", marks: [{ type: "strike" }] },
        {
          type: "text",
          text: " 링크",
          marks: [{ type: "link", attrs: { href: "https://example.com" } }],
        },
      ],
    },
    {
      type: "bulletList",
      content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "목록" }] }] }],
    },
    { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "인용" }] }] },
  ],
};

describe("validatePostInput", () => {
  it("서버 입력 Zod 스키마는 허용 JSON과 제목을 함께 파싱한다", () => {
    expect(postInputSchema.safeParse({ title: "게시글 제목", content: allowedContent }).success).toBe(true);
    expect(postInputSchema.safeParse({ title: "게시글 제목", content: "<p>임의 HTML</p>" }).success).toBe(false);
  });

  it("허용된 Tiptap 노드와 mark만 저장 가능한 JSON과 검색용 본문으로 정규화한다", () => {
    expect(validatePostInput({ title: "게시글 제목", content: allowedContent })).toEqual({
      valid: true,
      value: {
        title: "게시글 제목",
        content: allowedContent,
        plainText: "제목\n굵게 기울임 취소 링크\n목록\n인용",
      },
    });
  });

  it.each([
    ["", "invalid_title_length"],
    ["a".repeat(121), "invalid_title_length"],
  ])("제목 %j은 1~120자로 제한한다", (title, reason) => {
    expect(validatePostInput({ title, content: allowedContent })).toEqual({
      valid: false,
      reason,
    });
  });

  it("빈 일반 텍스트 본문은 거부한다", () => {
    expect(
      validatePostInput({
        title: "게시글 제목",
        content: { type: "doc", content: [{ type: "paragraph" }] },
      }),
    ).toEqual({ valid: false, reason: "invalid_content_length" });
  });

  it("20,001자 일반 텍스트 본문은 거부한다", () => {
    expect(
      validatePostInput({
        title: "게시글 제목",
        content: {
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: "가".repeat(20_001) }] }],
        },
      }),
    ).toEqual({ valid: false, reason: "invalid_content_length" });
  });

  it.each([
    { type: "doc", content: [{ type: "image", attrs: { src: "https://example.com/image.png" } }] },
    { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "코드", marks: [{ type: "code" }] }] }] },
    "<p>임의 HTML</p>",
  ])("허용하지 않은 Tiptap 구조와 임의 HTML을 거부한다", (content) => {
    expect(validatePostInput({ title: "게시글 제목", content })).toEqual({
      valid: false,
      reason: "invalid_content_structure",
    });
  });

  it("실행 가능한 링크 URL은 허용하지 않는다", () => {
    expect(
      validatePostInput({
        title: "게시글 제목",
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "위험 링크",
                  marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
                },
              ],
            },
          ],
        },
      }),
    ).toEqual({ valid: false, reason: "invalid_content_structure" });
  });
});
