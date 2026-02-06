# Progressive Rendering Pipeline

Streaming SSR React application built with renderToPipeableStream to deliver an above-the-fold server-rendered shell while progressively enabling heavier client features.

The system prioritizes early render performance through partial streaming, deterministic rendering, and visibility-driven hydration.

Media is optimized for perceived load speed: images progressively enhance in quality, while video defaults to WebM with MP4 and still-image fallbacks.

Interactive subsystems mount within an isolated shadow root to prevent style bleed and reduce layout instability.
