// src/dynamic-app/components/introOverlay.jsx
import React, { useEffect, useState } from 'react';

const RedIntroOverlay = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#1e1e1f',
        opacity: visible ? 1 : 0,
        pointerEvents: 'none',
        transition: 'opacity 0.4s ease',
        zIndex: 9999,
      }}
    />
  );
};

export default RedIntroOverlay;
