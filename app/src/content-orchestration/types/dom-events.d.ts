declare global {
  interface DocumentEventMap {
    'synthetic-drag': CustomEvent<{
      phase: 'start' | 'move' | 'end';
      direction: 'up' | 'down';
      magnitude: number;
      velocity?: number;
      source: 'touch' | 'wheel';
      ts: number;
    }>;
    'focus-exit-start': CustomEvent<{ key: string }>;
    'focus-exit-unlock': CustomEvent<{ key: string }>;
  }
}
export {};
