import { describe, expect, it } from "vitest";

import { parseYouTubeUrl } from "./youtube";

describe("parseYouTubeUrl", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=43", "dQw4w9WgXcQ"],
  ])("공식 URL %s에서 영상 ID와 썸네일을 추출한다", (url, id) => {
    expect(parseYouTubeUrl(url)).toEqual({
      id,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    });
  });

  it.each([
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "https://example.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=not-an-id",
    "not a URL",
  ])("공식 도메인이 아니거나 유효한 ID가 없는 입력은 거부한다", (url) => {
    expect(parseYouTubeUrl(url)).toBeNull();
  });
});
