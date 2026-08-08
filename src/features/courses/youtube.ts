const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export type YouTubeVideo = {
  id: string;
  thumbnailUrl: string;
};

function videoIdFromUrl(url: globalThis.URL) {
  if (url.hostname === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] ?? null;
  }

  if (url.hostname === "youtube.com" || url.hostname === "www.youtube.com") {
    if (url.pathname === "/watch") {
      return url.searchParams.get("v");
    }

    const [kind, id] = url.pathname.split("/").filter(Boolean);
    return kind === "embed" || kind === "shorts" ? id ?? null : null;
  }

  return null;
}

export function parseYouTubeUrl(value: string): YouTubeVideo | null {
  let url: globalThis.URL;
  try {
    url = new globalThis.URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }

  const id = videoIdFromUrl(url);
  if (!id || !YOUTUBE_VIDEO_ID.test(id)) {
    return null;
  }

  return {
    id,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}
