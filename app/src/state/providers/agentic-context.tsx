// src/state/providers/agentic-context.tsx
import React, { createContext, useState, useContext, useRef, useCallback } from 'react';

export type AgenticMode = 'conversation' | 'job-search' | 'svg-creation';
export type Message = { role: 'user' | 'assistant'; content: string };

interface AgenticContextType {
  mode: AgenticMode;
  setMode: (m: AgenticMode) => void;
  messages: Message[];
  sendMessage: (content: string) => void;
  isStreaming: boolean;
  hasMessages: boolean;
  scrollPercent: number;
  setScrollPercent: (p: number) => void;
  requestScrollToBottom: () => void;
  registerScrollToBottom: (fn: () => void) => void;
}

const AgenticContext = createContext<AgenticContextType | undefined>(undefined);

const EMPTY_THREADS: Record<AgenticMode, Message[]> = {
  'conversation': [],
  'job-search': [],
  'svg-creation': [],
};

export function AgenticProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AgenticMode>('conversation');
  const [threads, setThreads] = useState<Record<AgenticMode, Message[]>>(EMPTY_THREADS);
  const [isStreaming, setIsStreaming] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(100);

  const messages = threads[mode];
  const hasMessages = messages.length > 0;

  const scrollToBottomRef = useRef<() => void>(() => {});
  const requestScrollToBottom = useCallback(() => { scrollToBottomRef.current(); }, []);
  const registerScrollToBottom = useCallback((fn: () => void) => { scrollToBottomRef.current = fn; }, []);

  const sendMessage = useCallback(async (content: string) => {
    const activeMode = mode;
    const userMsg: Message = { role: 'user', content };
    const nextMessages: Message[] = [...threads[activeMode], userMsg];

    setThreads(prev => ({ ...prev, [activeMode]: [...nextMessages, { role: 'assistant', content: '' }] }));
    setIsStreaming(true);

    try {
      const res = await fetch('/api/claude/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') break;
          try {
            const { text } = JSON.parse(payload);
            if (text) {
              setThreads(prev => {
                const thread = [...prev[activeMode]];
                thread[thread.length - 1] = {
                  ...thread[thread.length - 1],
                  content: thread[thread.length - 1].content + text,
                };
                return { ...prev, [activeMode]: thread };
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      setThreads(prev => {
        const thread = [...prev[activeMode]];
        thread[thread.length - 1] = { role: 'assistant', content: 'Something went wrong.' };
        return { ...prev, [activeMode]: thread };
      });
    } finally {
      setIsStreaming(false);
    }
  }, [threads, mode]);

  return (
    <AgenticContext.Provider value={{ mode, setMode, messages, sendMessage, isStreaming, hasMessages, scrollPercent, setScrollPercent, requestScrollToBottom, registerScrollToBottom }}>
      {children}
    </AgenticContext.Provider>
  );
}

export function useAgentic(): AgenticContextType {
  const ctx = useContext(AgenticContext);
  if (!ctx) throw new Error('useAgentic must be used within AgenticProvider');
  return ctx;
}
