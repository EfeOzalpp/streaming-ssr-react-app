// src/state/providers/project-context.tsx
import React, {
  createContext,
  useState,
  useContext,
  useRef,
  ReactNode,
} from 'react';

type ViewportAlignArgs = {
  /** Prefer one of these to identify the block to align */
  id?: string;              // e.g. 'block-game'
  key?: string;             // e.g. 'game' -> resolves to #block-game in your aligner
  el?: HTMLElement | null;  // direct element if you have it
  /** Re-verify/re-apply on next rAF (helps on mobile Safari) */
  retry?: boolean;
};

interface ProjectVisibilityContextType {
  activeProject?: string;
  setActiveProject: (title: string) => void;

  blockGClick: boolean;
  setBlockGClick: (clicked: boolean) => void;

  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;

  scrollContainerRef: React.RefObject<HTMLDivElement>;

  isDragging: boolean;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;

  focusedProjectKey: string | null;
  setFocusedProjectKey: React.Dispatch<React.SetStateAction<string | null>>;

  previousScrollY: number | null;
  setPreviousScrollY: React.Dispatch<React.SetStateAction<number | null>>;

  /** Ask ScrollController to instantly align a block to the top (no smooth, no bump) */
  requestViewportAlign: (args: ViewportAlignArgs) => void;

  /**
   * Register the actual align function (implemented inside ScrollController).
   * ScrollController should call this once on mount and clean up on unmount.
   */
  registerViewportAlign: (fn: (args: ViewportAlignArgs) => void) => void;
}

interface ProjectVisibilityProviderProps {
  children: ReactNode;
}

const ProjectVisibilityContext = createContext<ProjectVisibilityContextType | undefined>(undefined);

export const ProjectVisibilityProvider = ({ children }: ProjectVisibilityProviderProps) => {
  const [activeProject, setActiveProject] = useState<string | undefined>(undefined);
  const [blockGClick, setBlockGClick] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [focusedProjectKey, setFocusedProjectKey] = useState<string | null>(null);
  const [previousScrollY, setPreviousScrollY] = useState<number | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // The ScrollController will register its implementation here.
  const alignFnRef = useRef<(args: ViewportAlignArgs) => void>(() => { /* no-op by default */ });

  const requestViewportAlign = React.useCallback((args: ViewportAlignArgs) => {
    alignFnRef.current?.(args);
  }, []);

  const registerViewportAlign = React.useCallback((fn: (args: ViewportAlignArgs) => void) => {
    alignFnRef.current = fn || (() => {});
  }, []);

  return (
    <ProjectVisibilityContext.Provider
      value={{
        activeProject,
        setActiveProject,
        blockGClick,
        setBlockGClick,
        currentIndex,
        setCurrentIndex,
        scrollContainerRef,
        isDragging,
        setIsDragging,
        focusedProjectKey,
        setFocusedProjectKey,
        previousScrollY,
        setPreviousScrollY,
        requestViewportAlign,
        registerViewportAlign,
      }}
    >
      {children}
    </ProjectVisibilityContext.Provider>
  );
};

export const useProjectVisibility = () => {
  const context = useContext(ProjectVisibilityContext);
  if (!context) {
    throw new Error('useProjectVisibility must be used within ProjectVisibilityProvider');
  }
  return context;
};
