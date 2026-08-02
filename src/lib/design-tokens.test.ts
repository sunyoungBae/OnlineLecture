import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { designTokens, getDesignToken } from "./design-tokens";

const globalStyles = readFileSync("src/app/globals.css", "utf8");
const buttonSource = readFileSync("src/components/ui/button.tsx", "utf8");
const inputSource = readFileSync("src/components/ui/input.tsx", "utf8");
const textareaSource = readFileSync("src/components/ui/textarea.tsx", "utf8");
const labelSource = readFileSync("src/components/ui/label.tsx", "utf8");

describe("design tokens", () => {
  it("exposes the approved Sera palette, layout, and typography contracts", () => {
    expect(designTokens).toMatchObject({
      colors: {
        background: "#F7F7F2",
        surface: "#FFFFFF",
        foreground: "#171717",
        mutedForeground: "#6B6B65",
        border: "#D9D9D2",
        accent: "#C8FF3D",
        destructive: "#C93C37",
        success: "#18794E",
      },
      layout: {
        contentMaxWidth: "1200px",
        readingMaxWidth: "760px",
        pagePaddingMobile: "20px",
        pagePaddingDesktop: "32px",
        spacingUnit: "4px",
        radius: "2px",
      },
      typography: {
        headingFontFamily: '"Noto Serif KR", serif',
        bodyFontFamily: '"Noto Sans KR", sans-serif',
      },
    });
  });

  it("returns an approved token and rejects an unknown token path", () => {
    expect(getDesignToken("colors.accent")).toBe("#C8FF3D");
    expect(() => getDesignToken("colors.dark")).toThrow(
      "Unknown design token: colors.dark",
    );
  });

  it("keeps the CSS font, focus, touch target, and Base UI field contracts", () => {
    expect(globalStyles).toContain(
      '--font-sans: var(--font-noto-sans-kr), "Noto Sans KR", sans-serif;',
    );
    expect(globalStyles).toContain(
      '--font-serif: var(--font-noto-serif-kr), "Noto Serif KR", serif;',
    );
    expect(globalStyles).toContain("min-height: 44px;");
    expect(globalStyles).toContain(":focus-visible");
    expect(buttonSource).toContain('from "@base-ui/react/button"');
    expect(inputSource).toContain('from "@base-ui/react/input"');
    expect(textareaSource).toContain('from "@base-ui/react/field"');
    expect(textareaSource).toContain("<Field.Control");
    expect(labelSource).toContain('from "@base-ui/react/field"');
    expect(labelSource).toContain("<Field.Label");
    expect(labelSource).toContain("inline-flex min-h-11 items-center");
  });
});
