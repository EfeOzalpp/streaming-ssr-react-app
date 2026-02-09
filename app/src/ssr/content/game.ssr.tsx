// src/ssr/projects/game.ssr.tsx
import type { SsrDescriptor } from '../types';
import { getProjectData } from '../../services/sanity/get-project-data';
import {
  getMediumImageUrl,
  getHighQualityImageUrl,
} from '../../services/media/image-builder';

type CoinDoc = { alt?: string; image?: any };

export const gameSSR: SsrDescriptor = {
  fetch: async (): Promise<CoinDoc | null> =>
    await getProjectData<CoinDoc>('rock-coin'),

  render: (coin: CoinDoc | null) => {
    const alt = coin?.alt ?? 'Loading';

    // Build responsive URLs
    const mediumUrl = coin?.image ? getMediumImageUrl(coin.image) : undefined;
    const highUrl = coin?.image
      ? getHighQualityImageUrl(coin.image, 512, 80) // coin doesn’t need 2k res
      : undefined;

    return (
      <section
        tabIndex={-1}
        className="block-type-g"
        style={{ position: 'relative' }}
        data-ssr-shell="block-game"
      >
        {/* REQUIRED wrapper – enhancer portals into this and animates it away */}
        <div
          className="block-g-onboarding tooltip-block-g"
          aria-live="polite"
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <div className="coin" style={{ pointerEvents: 'none' }}>
            {mediumUrl && (
              <img
                src={mediumUrl}
                {...(highUrl ? { 'data-src-full': highUrl } : {})}
                alt={alt}
                decoding="async"
                loading="eager"
                draggable={false}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            )}
          </div>

          <h1 className="onboarding-text" style={{ pointerEvents: 'none' }}>
            Loading Game…
          </h1>
        </div>

        {/* REQUIRED: the enhancer will mount the stage/canvas here */}
      </section>
    );
  },

  buildPreloads: (coin: CoinDoc | null) =>
    coin?.image ? [`<link rel="preload" as="image" href="${getMediumImageUrl(coin.image)}">`] : [],

  criticalCssFiles: ['src/styles/block-type-g.css'],
};
