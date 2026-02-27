import { useCallback, useRef } from 'react';

export function useProjectRefs() {
  const projectRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const setProjectRef = useCallback((key: string, el: HTMLDivElement | null) => {
    projectRefs.current[key] = el;
  }, []);

  return { projectRefs, setProjectRef };
}
