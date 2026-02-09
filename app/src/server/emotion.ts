// src/server/emotion.ts
import createCache from '@emotion/cache';
import createEmotionServer from '@emotion/server/create-instance';

export function createEmotion() {
  const cache = createCache({ key: 'css', prepend: true });
  const { extractCriticalToChunks, constructStyleTagsFromChunks } = createEmotionServer(cache);
  return { cache, extractCriticalToChunks, constructStyleTagsFromChunks };
}
