function safeParseUrl(value = '') {
  const normalized = value.trim();

  if (!normalized) return null;

  try {
    return new URL(normalized);
  } catch {
    try {
      return new URL(`https://${normalized}`);
    } catch {
      return null;
    }
  }
}

function isValidVideoId(value) {
  return /^[a-zA-Z0-9_-]{11}$/.test(value ?? '');
}

export function extractYouTubeVideoId(value = '') {
  const url = safeParseUrl(value);
  if (!url) return null;

  const host = url.hostname.toLowerCase();

  if (host === 'youtu.be' || host === 'www.youtu.be') {
    const [videoId] = url.pathname.split('/').filter(Boolean);
    return isValidVideoId(videoId) ? videoId : null;
  }

  const isYoutubeHost =
    host === 'youtube.com' ||
    host === 'www.youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'youtube-nocookie.com' ||
    host === 'www.youtube-nocookie.com';

  if (!isYoutubeHost) return null;

  if (url.pathname === '/watch') {
    const videoId = url.searchParams.get('v');
    return isValidVideoId(videoId) ? videoId : null;
  }

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length < 2) return null;

  const [kind, videoId] = segments;
  if (!['embed', 'shorts', 'live'].includes(kind)) return null;

  return isValidVideoId(videoId) ? videoId : null;
}

export function getYouTubeEmbedUrl(value = '', options = {}) {
  const videoId = extractYouTubeVideoId(value);
  if (!videoId) return null;

  const url = safeParseUrl(value);
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
  });

  if (options.preserveList !== false) {
    const playlist = url?.searchParams.get('list');
    if (playlist) {
      params.set('list', playlist);
    }
  }

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}
