import { describe, expect, it } from "vitest";
import { designTokens, getDesignToken } from "./design-tokens";

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
});
