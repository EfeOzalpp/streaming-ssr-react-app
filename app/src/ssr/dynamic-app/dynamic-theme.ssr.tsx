// src/ssr/dynamic-app/dynamic-theme.ssr.tsx
import type { RouteSsrDescriptor } from '../route-types';
import { prepareDynamicRoute } from '../../server/prepareDynamicRoute';
import { renderUIcardsHTML } from './UIcards.ssr';

export const dynamicThemeSSR: RouteSsrDescriptor = {
  fetch: async (seed?: number) => prepareDynamicRoute(seed),
  render: (data) => {
    const { images = [], icons = {} } = data || {};
    const arrow = icons['arrow2'] || ''; // inline SVG expected

    return (
      <section id="dynamic-theme-ssr" className="dynamic-theme-block ssr-initial">
        {/* Client-only portals */}
        <div className="navigation-wrapper" id="dynamic-nav-mount"></div>

        <div className="firework-wrapper">
          <div className="firework-divider" id="dynamic-fireworks-mount"></div>
        </div>

        {/* keep the visual spacer like in the client */}
        <div className="section-divider"></div>

        {/* Title mount (client-only portal attaches here) */}
        <div className="title-divider" id="dynamic-title-mount"></div>

        {/* Pause button mount (client-only portal attaches here) */}
        <div className="pause-button-wrapper" id="dynamic-pause-mount"></div>

        {/* SortBy stub (client enhancer upgrades) */}
        <div className="sort-by-divider" id="dynamic-sortby-mount" data-ssr-stub="true">
          <h3 className="students-heading">Students</h3>
          <div className="sort-by-container">
            <div className="sort-container"><p>Sort by:</p></div>
            <div className="sort-container2">
              <div className="custom-dropdown">
                <div className="custom-select">
                  <div className="selected-value"><h5>Randomized</h5></div>
                  <span className="custom-arrow">
                    {arrow ? <div className="svg-icon" dangerouslySetInnerHTML={{ __html: arrow }} /> : null}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* spacer before cards like the client */}
        <div className="section-divider2"></div>

        {/* Cards snapshot with LQ images + per-card SVGs */}
        <div
          dangerouslySetInnerHTML={{
            __html: renderUIcardsHTML(images, icons, 12),
          }}
        />

        {/* Footer mount */}
        <div className="footer-wrapper" id="dynamic-footer-mount"></div>
      </section>
    );
  },
};
