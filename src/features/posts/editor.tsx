"use client";

import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { useActionState, useState } from "react";

import type { TiptapDocument } from "./content";

export type PostEditorState =
  | { status: "idle" }
  | { status: "error"; message: string };

export type PostFormData = { get: (name: string) => unknown };

export type PostEditorAction = (
  previousState: PostEditorState,
  formData: PostFormData,
) => Promise<PostEditorState>;

type PostEditorProps = {
  action: PostEditorAction;
  initialContent?: TiptapDocument;
  initialTitle?: string;
  submitLabel: string;
};

const EMPTY_DOCUMENT: TiptapDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function isSafeLinkHref(value: string) {
  try {
    const protocol = new globalThis.URL(value).protocol;
    return protocol === "http:" || protocol === "https:" || protocol === "mailto:";
  } catch {
    return false;
  }
}

function EditorButton({
  active = false,
  children,
  label,
  onClick,
}: {
  active?: boolean;
  children: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className="min-h-11 border border-[var(--border)] px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function PostEditor({
  action,
  initialContent = EMPTY_DOCUMENT,
  initialTitle = "",
  submitLabel,
}: PostEditorProps) {
  const [content, setContent] = useState(() => JSON.stringify(initialContent));
  const [state, formAction, isPending] = useActionState(action, { status: "idle" });
  const editor = useEditor({
    immediatelyRender: false,
    content: initialContent,
    extensions: [
      StarterKit.configure({
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
        underline: false,
      }),
      Link.configure({
        autolink: false,
        linkOnPaste: false,
        openOnClick: false,
        protocols: ["http", "https", "mailto"],
        isAllowedUri: (href) => isSafeLinkHref(href),
      }),
    ],
    editorProps: {
      attributes: {
        "aria-label": "게시글 본문",
        class:
          "min-h-44 border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-7 outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      setContent(JSON.stringify(updatedEditor.getJSON()));
    },
  });

  function setLink() {
    const href = globalThis.prompt("링크 주소를 입력해 주세요.");
    if (!href || !isSafeLinkHref(href)) {
      return;
    }

    editor?.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  const error = state.status === "error" ? state.message : null;

  return (
    <form action={formAction} className="mt-8 space-y-6">
      <div>
        <label className="block text-sm font-medium" htmlFor="post-title">
          제목
        </label>
        <input
          aria-describedby={error ? "post-error" : undefined}
          aria-invalid={Boolean(error)}
          className="mt-2 min-h-11 w-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          defaultValue={initialTitle}
          id="post-title"
          maxLength={120}
          name="title"
          required
          type="text"
        />
      </div>

      <div>
        <p className="text-sm font-medium" id="post-content-label">
          본문
        </p>
        <div aria-label="본문 서식" className="mt-2 flex flex-wrap gap-2" role="toolbar">
          <EditorButton
            active={editor?.isActive("heading", { level: 2 })}
            label="제목 2"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            제목
          </EditorButton>
          <EditorButton active={editor?.isActive("bold")} label="굵게" onClick={() => editor?.chain().focus().toggleBold().run()}>
            굵게
          </EditorButton>
          <EditorButton active={editor?.isActive("italic")} label="기울임" onClick={() => editor?.chain().focus().toggleItalic().run()}>
            기울임
          </EditorButton>
          <EditorButton active={editor?.isActive("strike")} label="취소선" onClick={() => editor?.chain().focus().toggleStrike().run()}>
            취소선
          </EditorButton>
          <EditorButton active={editor?.isActive("bulletList")} label="글머리 목록" onClick={() => editor?.chain().focus().toggleBulletList().run()}>
            글머리
          </EditorButton>
          <EditorButton active={editor?.isActive("orderedList")} label="번호 목록" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
            번호
          </EditorButton>
          <EditorButton active={editor?.isActive("blockquote")} label="인용" onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
            인용
          </EditorButton>
          <EditorButton active={editor?.isActive("link")} label="링크" onClick={setLink}>
            링크
          </EditorButton>
          <EditorButton label="실행 취소" onClick={() => editor?.chain().focus().undo().run()}>
            실행 취소
          </EditorButton>
        </div>
        <div aria-labelledby="post-content-label" className="mt-2">
          <EditorContent editor={editor} />
        </div>
        <input name="content" type="hidden" value={content} />
      </div>

      {error ? (
        <p className="text-sm text-[var(--destructive)]" id="post-error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="min-h-11 border border-transparent bg-[var(--accent)] px-5 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "저장 중..." : submitLabel}
      </button>
    </form>
  );
}
