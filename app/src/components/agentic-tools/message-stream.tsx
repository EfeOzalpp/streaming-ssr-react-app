// src/components/agentic-tools/message-stream.tsx
import { useEffect, useRef, useState } from 'react';
import { useAgentic } from '../../state/providers/agentic-context';

const CopyIcon = () => (
  <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 15C4.06812 15 3.60218 15 3.23463 14.8478C2.74458 14.6448 2.35523 14.2554 2.15224 13.7654C2 13.3978 2 12.9319 2 12V5.2C2 4.0799 2 3.51984 2.21799 3.09202C2.40973 2.71569 2.71569 2.40973 3.09202 2.21799C3.51984 2 4.0799 2 5.2 2H12C12.9319 2 13.3978 2 13.7654 2.15224C14.2554 2.35523 14.6448 2.74458 14.8478 3.23463C15 3.60218 15 4.06812 15 5M12.2 22H18.8C19.9201 22 20.4802 22 20.908 21.782C21.2843 21.5903 21.5903 21.2843 21.782 20.908C22 20.4802 22 19.9201 22 18.8V12.2C22 11.0799 22 10.5198 21.782 10.092C21.5903 9.71569 21.2843 9.40973 20.908 9.21799C20.4802 9 19.9201 9 18.8 9H12.2C11.0799 9 10.5198 9 10.092 9.21799C9.71569 9.40973 9.40973 9.71569 9.21799 10.092C9 10.5198 9 11.0799 9 12.2V18.8C9 19.9201 9 20.4802 9.21799 20.908C9.40973 21.2843 9.71569 21.5903 10.092 21.782C10.5198 22 11.0799 22 12.2 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function MessageStream() {
  const { messages, isStreaming, setScrollPercent, registerScrollToBottom } = useAgentic();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);
  const [touchedIndex, setTouchedIndex] = useState<number | null>(null);

  // Register scroll-to-bottom so external callers (e.g. the button in AgenticSurface) can trigger it
  useEffect(() => {
    registerScrollToBottom(() => {
      containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, [registerScrollToBottom]);

  // Scroll event → update percent (0 = top, 100 = bottom/caught-up)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollHeight - el.clientHeight;
      setScrollPercent(max <= 0 ? 100 : Math.round((el.scrollTop / max) * 100));
    };
    el.addEventListener('scroll', update, { passive: true });
    return () => el.removeEventListener('scroll', update);
  }, [setScrollPercent]);

  // When all messages fit without overflow, ensure percent stays at 100
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight) setScrollPercent(100);
  }, [messages, setScrollPercent]);

  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      prevLengthRef.current = messages.length;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setScrollPercent(100);
    }
  }, [messages, setScrollPercent]);

  return (
    <div ref={containerRef} className="at-messages">
      {messages.map((msg, i) => {
        const isLast = i === messages.length - 1;
        const showCursor = isLast && msg.role === 'assistant' && isStreaming;
        const isTouched = touchedIndex === i;
        return (
          <div
            key={i}
            className={`at-message-wrapper ${msg.role}`}
            onTouchStart={() => setTouchedIndex(isTouched ? null : i)}
          >
            <p className={`at-message ${msg.role}`}>
              {msg.content}
              {showCursor && <span className="at-cursor" />}
            </p>
            <button
              className={`at-copy-btn${isTouched ? ' touch-visible' : ''}`}
              onClick={() => navigator.clipboard.writeText(msg.content)}
              aria-label="Copy message"
            >
              <CopyIcon />
            </button>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
