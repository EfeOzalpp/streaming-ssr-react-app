// src/ScopedShell.jsx
import { useEffect, useRef } from 'react';

export default function ScopedShell({ children }) {
  const shellRef = useRef(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      shellRef.current?.removeAttribute('data-prehydrate');
    });
  }, []);

  return (
    <div id="main-shell" ref={shellRef} data-prehydrate>
      {children}
    </div>
  );
}