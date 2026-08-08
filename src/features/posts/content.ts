export type TiptapMark = {
  attrs?: Record<string, unknown>;
  type: "bold" | "italic" | "strike" | "link";
};

export type TiptapNode = {
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
  type:
    | "doc"
    | "paragraph"
    | "heading"
    | "bulletList"
    | "orderedList"
    | "listItem"
    | "blockquote"
    | "hardBreak"
    | "text";
};

export type TiptapDocument = TiptapNode & { type: "doc" };

export type PostInputValidation =
  | {
      valid: true;
      value: { content: TiptapDocument; plainText: string; title: string };
    }
  | {
      valid: false;
      reason: "invalid_title_length" | "invalid_content_length" | "invalid_content_structure";
    };

const INLINE_NODES = new Set(["text", "hardBreak"]);
const BLOCK_NODES = new Set(["paragraph", "heading", "bulletList", "orderedList", "blockquote"]);
const ALLOWED_MARKS = new Set(["bold", "italic", "strike", "link"]);
const INVALID_CONTENT_STRUCTURE = "invalid_content_structure";
const INVALID_CONTENT_LENGTH = "invalid_content_length";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: string[]) {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function isSafeLinkHref(value: string) {
  try {
    const protocol = new globalThis.URL(value).protocol;
    return protocol === "http:" || protocol === "https:" || protocol === "mailto:";
  } catch {
    return false;
  }
}

function validMarks(value: unknown) {
  if (value === undefined) {
    return true;
  }

  return (
    Array.isArray(value) &&
    value.every((mark) => {
      if (!isRecord(mark) || typeof mark.type !== "string" || !ALLOWED_MARKS.has(mark.type)) {
        return false;
      }

      if (!hasOnlyKeys(mark, ["type", "attrs"])) {
        return false;
      }

      if (mark.type !== "link") {
        return mark.attrs === undefined;
      }

      return (
        isRecord(mark.attrs) &&
        hasOnlyKeys(mark.attrs, ["href", "target", "rel", "class"]) &&
        typeof mark.attrs.href === "string" &&
        isSafeLinkHref(mark.attrs.href) &&
        (mark.attrs.target === undefined || typeof mark.attrs.target === "string" || mark.attrs.target === null) &&
        (mark.attrs.rel === undefined || typeof mark.attrs.rel === "string" || mark.attrs.rel === null) &&
        (mark.attrs.class === undefined || typeof mark.attrs.class === "string" || mark.attrs.class === null)
      );
    })
  );
}

function childText(content: TiptapNode[], separator: string) {
  return content.map(extractText).join(separator);
}

function extractText(node: TiptapNode): string {
  if (node.type === "text") {
    return node.text ?? "";
  }

  if (node.type === "hardBreak") {
    return "\n";
  }

  const content = node.content ?? [];
  if (node.type === "doc" || node.type === "bulletList" || node.type === "orderedList" || node.type === "listItem" || node.type === "blockquote") {
    return childText(content, "\n");
  }

  return childText(content, "");
}

function isValidNode(value: unknown, parentType?: TiptapNode["type"]): value is TiptapNode {
  if (!isRecord(value) || typeof value.type !== "string" || !hasOnlyKeys(value, ["type", "attrs", "content", "marks", "text"])) {
    return false;
  }

  const { attrs, content, marks, text, type } = value;
  if (type === "text") {
    return (
      typeof text === "string" &&
      content === undefined &&
      attrs === undefined &&
      validMarks(marks) &&
      (parentType === "paragraph" || parentType === "heading")
    );
  }

  if (type === "hardBreak") {
    return content === undefined && attrs === undefined && marks === undefined && text === undefined;
  }

  if (type === "doc") {
    return (
      parentType === undefined &&
      attrs === undefined &&
      marks === undefined &&
      text === undefined &&
      Array.isArray(content) &&
      content.every((node) => isValidNode(node, "doc") && BLOCK_NODES.has(node.type))
    );
  }

  if (type === "paragraph") {
    return (
      attrs === undefined &&
      marks === undefined &&
      text === undefined &&
      (content === undefined ||
        (Array.isArray(content) &&
          content.every((node) => isValidNode(node, "paragraph") && INLINE_NODES.has(node.type))))
    );
  }

  if (type === "heading") {
    return (
      isRecord(attrs) &&
      hasOnlyKeys(attrs, ["level"]) &&
      typeof attrs.level === "number" &&
      Number.isInteger(attrs.level) &&
      attrs.level >= 1 &&
      attrs.level <= 6 &&
      marks === undefined &&
      text === undefined &&
      Array.isArray(content) &&
      content.every((node) => isValidNode(node, "heading") && INLINE_NODES.has(node.type))
    );
  }

  if (type === "bulletList" || type === "orderedList") {
    const validAttrs =
      attrs === undefined ||
      (type === "orderedList" &&
        isRecord(attrs) &&
        hasOnlyKeys(attrs, ["start", "type"]) &&
        (attrs.start === undefined || (typeof attrs.start === "number" && Number.isInteger(attrs.start))) &&
        (attrs.type === undefined || typeof attrs.type === "string" || attrs.type === null));

    return (
      validAttrs &&
      marks === undefined &&
      text === undefined &&
      Array.isArray(content) &&
      content.every((node) => isValidNode(node, type) && node.type === "listItem")
    );
  }

  if (type === "listItem") {
    return (
      (parentType === "bulletList" || parentType === "orderedList") &&
      attrs === undefined &&
      marks === undefined &&
      text === undefined &&
      Array.isArray(content) &&
      content.every(
        (node) =>
          isValidNode(node, "listItem") &&
          (node.type === "paragraph" || node.type === "bulletList" || node.type === "orderedList"),
      )
    );
  }

  if (type === "blockquote") {
    return (
      attrs === undefined &&
      marks === undefined &&
      text === undefined &&
      Array.isArray(content) &&
      content.every((node) => isValidNode(node, "blockquote") && (node.type === "paragraph" || node.type === "heading" || node.type === "bulletList" || node.type === "orderedList"))
    );
  }

  return false;
}

export const postInputSchema = z
  .object({
    content: z.unknown(),
    title: z.string().trim().min(1).max(120),
  })
  .superRefine(({ content }, context) => {
    if (!isValidNode(content) || content.type !== "doc") {
      context.addIssue({
        code: "custom",
        message: INVALID_CONTENT_STRUCTURE,
        path: ["content"],
      });
      return;
    }

    const plainText = extractText(content).trim();
    if (Array.from(plainText).length < 1 || Array.from(plainText).length > 20_000) {
      context.addIssue({
        code: "custom",
        message: INVALID_CONTENT_LENGTH,
        path: ["content"],
      });
    }
  });

export function validatePostInput(input: { content: unknown; title: unknown }): PostInputValidation {
  const parsed = postInputSchema.safeParse(input);
  if (!parsed.success) {
    const contentIssue = parsed.error.issues.find((issue) => issue.path[0] === "content");
    if (contentIssue?.message === INVALID_CONTENT_LENGTH) {
      return { valid: false, reason: "invalid_content_length" };
    }

    if (contentIssue) {
      return { valid: false, reason: "invalid_content_structure" };
    }

    return { valid: false, reason: "invalid_title_length" };
  }

  const content = parsed.data.content as TiptapDocument;
  const plainText = extractText(content).trim();

  return {
    valid: true,
    value: { title: parsed.data.title, content, plainText },
  };
}
import { z } from "zod";
