// src/behaviors/event-mount.tsx
import { useEffect, useRef, useState, type ComponentType } from 'react';

type Props = {
  /** dynamic import that returns { default: ReactComponent } */
  load: () => Promise<{ default: ComponentType<any> }>;
  /** when true: mount immediately; when false: unmount (but keep chunk in memory) */
  active: boolean;
  /** optional loading UI while the chunk fetches */
  fallback?: React.ReactNode;
  /** pass arbitrary props to the loaded component */
  componentProps?: Record<string, any>;
  /** simple fade; 0 disables */
  fadeMs?: number;
};

export default function EventMount({
  load,
  active,
  fallback = null,
  componentProps,
  fadeMs = 200,
}: Props) {
  const [Comp, setComp] = useState<ComponentType<any> | null>(null);
  const [visible, setVisible] = useState(false);
  const loadingRef = useRef<Promise<any> | null>(null);

  // Load code-split chunk when first activated
  useEffect(() => {
    if (!active) { setVisible(false); return; }
    if (!Comp) {
      if (!loadingRef.current) loadingRef.current = load().then(mod => {
        setComp(() => mod.default);
      });
    }
    // show as soon as we have the component
    let alive = true;
    (async () => {
      if (!Comp && loadingRef.current) await loadingRef.current;
      if (alive) setVisible(true);
    })();
    return () => { alive = false; };
  }, [active, load, Comp]);

  if (!active) return null;               // unmount when not active
  if (!Comp) return <>{fallback}</>;      // show fallback until chunk arrives

  return (
    <div
      style={{
        opacity: fadeMs ? (visible ? 1 : 0) : 1,
        transition: fadeMs ? `opacity ${fadeMs}ms ease` : undefined,
        willChange: fadeMs ? 'opacity' : undefined,
      }}
    >
      <Comp {...(componentProps ?? {})} />
    </div>
  );
}
