// src/dynamic-app/components/loadingPage.jsx
import React from 'react';

const LoadingScreen = () => {
  return (
    <div
      className="loading-screen"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#1e1e1f',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        color: '#fff',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          width: '24px',
          height: '24px',
          border: '3px solid #fff',
          borderTop: '3px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
