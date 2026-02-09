// src/state/loading/loading-hub.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../../styles/loading-hub.css';

type LoadingHubProps = {
  keyword?: string;
  lines?: string[];
  minHeight?: number | string;
  className?: string;
  ariaLabel?: string;
  progress?: number | null;
  cycleMs?: number;
  animMs?: number;
  /** Delay before showing loader (ms) */
  delayMs?: number;
};

export default function LoadingHub({
  keyword,
  lines = ['Loading…'],
  minHeight = 160,
  className = '',
  ariaLabel = 'Loading',
  progress = null,
  cycleMs = 1400,
  animMs = 900,
  delayMs = 400,
}: LoadingHubProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [show, setShow] = useState(false);

  // --- delay before showing loader ---
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  // rotate through provided lines
  const hasMultiple = lines.length > 1;
  useEffect(() => {
    if (!hasMultiple) return;
    const t = setInterval(() => {
      setLineIndex((i) => (i + 1) % lines.length);
    }, cycleMs);
    return () => clearInterval(t);
  }, [hasMultiple, lines.length, cycleMs]);

  // Avoid reflow: lock container height
  const style = useMemo<React.CSSProperties>(() => {
    const h = typeof minHeight === 'number' ? `${minHeight}px` : (minHeight ?? 'auto');
    return { minHeight: h };
  }, [minHeight]);

  // SR-only progressive percent
  const srRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (progress == null || !srRef.current) return;
    srRef.current.textContent = `${Math.round(progress)}%`;
  }, [progress]);

  if (!show) {
    // render an invisible placeholder with locked height
    return <div style={style} aria-hidden="true" />;
  }

  return (
    <div
      className={`loading-hub loading-hub--text ${className || ''}`}
      style={style}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      data-keyword={keyword || undefined}
      data-anim-ms={animMs}
    >
      <div className="loading-hub__copy" aria-hidden={false}>
        <h2 key={lineIndex} className="loading-hub__line">
          {lines[lineIndex]}
        </h2>

        {progress != null && (
          <div className="loading-hub__progress" aria-hidden="true">
            {Math.round(progress)}%
          </div>
        )}

        <span className="sr-only" ref={srRef} />
      </div>
    </div>
  );
}
