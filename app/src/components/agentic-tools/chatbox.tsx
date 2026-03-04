// src/components/agentic-tools/chatbox.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useAgentic } from '../../state/providers/agentic-context';
import type { AgenticMode } from '../../state/providers/agentic-context';

const MODES: { key: AgenticMode; label: string; icon?: React.ReactNode }[] = [
  { key: 'conversation', label: 'Conversation' },
  { key: 'job-search',   label: 'Job Search', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 21L16.65 16.65M11 6C13.7614 6 16 8.23858 16 11M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { key: 'svg-creation', label: 'Create SVGs', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 18L19.9999 19.094C19.4695 19.6741 18.7502 20 18.0002 20C17.2501 20 16.5308 19.6741 16.0004 19.094C15.4693 18.5151 14.75 18.1901 14.0002 18.1901C13.2504 18.1901 12.5312 18.5151 12 19.094M3.00003 20H4.67457C5.16376 20 5.40835 20 5.63852 19.9447C5.84259 19.8957 6.03768 19.8149 6.21663 19.7053C6.41846 19.5816 6.59141 19.4086 6.93732 19.0627L19.5001 6.49998C20.3285 5.67156 20.3285 4.32841 19.5001 3.49998C18.6716 2.67156 17.3285 2.67156 16.5001 3.49998L3.93729 16.0627C3.59139 16.4086 3.41843 16.5816 3.29475 16.7834C3.18509 16.9624 3.10428 17.1574 3.05529 17.3615C3.00003 17.5917 3.00003 17.8363 3.00003 18.3255V20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
];

const PLACEHOLDERS: Record<AgenticMode, string> = {
  'conversation': "What's on your mind?",
  'job-search':   'Enter the job title you\'re seeking',
  'svg-creation': 'What can I draw for you?',
};

const getScrollContainer = () =>
  document.querySelector('.Scroll') as HTMLElement | null;

export default function ChatBox() {
  const { mode, setMode, sendMessage, isStreaming } = useAgentic();
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea — restore outer scroll after browser's async scroll-into-view fires
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const scroller = getScrollContainer();
    const saved = scroller?.scrollTop ?? 0;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    if (scroller) requestAnimationFrame(() => { scroller.scrollTop = saved; });
  }, [input]);

  // Prevent outer scroll container from jumping when textarea receives focus
  const handleFocus = () => {
    const scroller = getScrollContainer();
    if (!scroller) return;
    const saved = scroller.scrollTop;
    requestAnimationFrame(() => { scroller.scrollTop = saved; });
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const switcherModes = MODES.slice(1);

  return (
    <div className="at-card">
      <textarea
        ref={textareaRef}
        className="at-input"
        id="form-field"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={PLACEHOLDERS[mode]}
        rows={1}
      />
      <div className="at-footer-row">
        <div className="at-mode-row">
          <span
            className={`at-conversation-label${mode === 'conversation' ? ' active' : ''}`}
            onClick={() => setMode('conversation')}
          >
            {MODES[0].label}
          </span>
          <div className="at-mode-switcher">
            {switcherModes.map(m => (
              <button
                key={m.key}
                className={`at-mode-btn${mode === m.key ? ' active' : ''}`}
                onClick={() => setMode(mode === m.key ? 'conversation' : m.key)}
              >
                {m.icon}
                {m.label}
                {mode === m.key && (
                  <span className="at-mode-close">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17 7L7 17M7 7L17 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <button
          className="at-send-btn"
          onClick={handleSubmit}
          disabled={!input.trim() || isStreaming}
          aria-label="Send"
        >
          Send
        </button>
      </div>
    </div>
  );
}
