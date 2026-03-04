// src/components/agentic-tools/index.tsx
import { AgenticProvider, useAgentic } from '../../state/providers/agentic-context';
import ChatBox from './chatbox';
import MessageStream from './message-stream';
import '../../styles/block-type-t.css';

function AgenticSurface() {
  const { hasMessages, mode, scrollPercent, messages, requestScrollToBottom } = useAgentic();
  const showFade = hasMessages && mode !== 'svg-creation';
  const showIndicator = messages.length >= 7;
  const caughtUp = scrollPercent >= 95;

  const greeting = mode === 'conversation' ? (
    <>
      Hello{' '}
      <svg style={{ display: 'inline', verticalAlign: 'middle', marginBottom: '0.1em' }} width="0.9em" height="0.9em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 15.2422C21.206 14.435 22 13.0602 22 11.5C22 9.15643 20.2085 7.23129 17.9203 7.01937C17.4522 4.17213 14.9798 2 12 2C9.02024 2 6.54781 4.17213 6.07974 7.01937C3.79151 7.23129 2 9.15643 2 11.5C2 13.0602 2.79401 14.435 4 15.2422M12.25 15L9.44995 22M17.05 13L14.25 20M9.05 13L6.25 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {' '}, how's everything?
    </>
  ) : mode === 'job-search' ? "I'll scrape relevant web domains."
    : mode === 'svg-creation' ? "Let's try to make some SVGs."
    : null;

  return (
    <div className={`at-surface${hasMessages ? ' has-messages' : ''}${mode === 'svg-creation' && hasMessages ? ' svg-top' : ''}`}>
      {showFade && (
        <div className="at-messages-fade">
          <div className="at-top-nav">
            <div className="at-top-nav-placeholder" />
            {showIndicator && (
              <div className={`at-scroll-indicator${caughtUp ? ' caught-up' : ''}`}>
                {caughtUp ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : `${scrollPercent}%`}
              </div>
            )}
          </div>
          <div className="at-gradient-fade" />
        </div>
      )}
      {showFade && scrollPercent < 75 && (
        <button className="at-scroll-bottom-btn" onClick={requestScrollToBottom} aria-label="Scroll to bottom">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
      {!hasMessages && greeting && <p className="at-greeting">{greeting}</p>}
      <MessageStream />
      <ChatBox />
    </div>
  );
}

export default function AgenticTools() {
  return (
    <AgenticProvider>
      <section
        className="agentic-tools"
        id="no-ssr"
        style={{ position: 'relative', width: '100%', height: '96dvh', overflow: 'hidden', overflowAnchor: 'none' }}
      >
        <AgenticSurface />
      </section>
    </AgenticProvider>
  );
}
