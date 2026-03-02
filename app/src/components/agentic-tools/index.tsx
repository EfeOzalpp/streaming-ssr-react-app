// src/components/agentic-tools/index.tsx
import { useEffect, useRef, useState } from 'react';
import '../../styles/block-type-t.css';

const MODES = ['Conversation', 'Job Search', 'Create SVGs'];
const PLACEHOLDERS = ["What's on your mind?", 'Tell me the Software Engineering Job you seek.', 'What can I draw for you?'];

export default function AgenticTools() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState(0);
  const [messages, setMessages] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getScrollContainer = () =>
    document.querySelector('.Scroll') as HTMLElement | null;

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

  // Scroll to bottom when new message added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    setMessages(prev => [...prev, trimmed]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <section
      className="agentic-tools"
      id="no-ssr"
      style={{ position: 'relative', width: '100%', height: '96dvh', overflow: 'hidden', overflowAnchor: 'none' }}
    >
      <div className={`at-surface${messages.length > 0 ? ' has-messages' : ''}`}>
        <div className="at-messages">
          <div className="at-messages-spacer" />
          {messages.map((msg, i) => (
            <div key={i} className="at-message">{msg}</div>
          ))}
          <div ref={messagesEndRef} />
        </div>
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
                className={`at-conversation-label${mode === 0 ? ' active' : ''}`}
                onClick={() => setMode(0)}
              >
                {MODES[0]}
              </span>
              <div className="at-mode-switcher">
                <div
                  className="at-mode-slider"
                  style={{
                    transform: `translateX(${(mode - 1) * 100}%)`,
                    opacity: mode === 0 ? 0 : 1,
                  }}
                />
                {MODES.slice(1).map((label, i) => (
                  <button
                    key={label}
                    className={`at-mode-btn${mode === i + 1 ? ' active' : ''}`}
                    onClick={() => setMode(i + 1)}
                  >
                    {mode === i + 1 && (
                      <span
                        className="at-mode-close"
                        onClick={e => { e.stopPropagation(); setMode(0); }}
                      >
                        ×
                      </span>
                    )}
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="at-send-btn"
              onClick={handleSubmit}
              disabled={!input.trim()}
              aria-label="Send"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
