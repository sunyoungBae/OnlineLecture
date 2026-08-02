export const designTokens = {
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
} as const;

const designTokenValues = {
  "colors.background": designTokens.colors.background,
  "colors.surface": designTokens.colors.surface,
  "colors.foreground": designTokens.colors.foreground,
  "colors.mutedForeground": designTokens.colors.mutedForeground,
  "colors.border": designTokens.colors.border,
  "colors.accent": designTokens.colors.accent,
  "colors.destructive": designTokens.colors.destructive,
  "colors.success": designTokens.colors.success,
  "layout.contentMaxWidth": designTokens.layout.contentMaxWidth,
  "layout.readingMaxWidth": designTokens.layout.readingMaxWidth,
  "layout.pagePaddingMobile": designTokens.layout.pagePaddingMobile,
  "layout.pagePaddingDesktop": designTokens.layout.pagePaddingDesktop,
  "layout.spacingUnit": designTokens.layout.spacingUnit,
  "layout.radius": designTokens.layout.radius,
  "typography.headingFontFamily": designTokens.typography.headingFontFamily,
  "typography.bodyFontFamily": designTokens.typography.bodyFontFamily,
} as const;

export type DesignTokenPath = keyof typeof designTokenValues;

export function getDesignToken(path: string): string {
  if (path in designTokenValues) {
    return designTokenValues[path as DesignTokenPath];
  }

  throw new Error(`Unknown design token: ${path}`);
}
