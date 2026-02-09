import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import loadable from '@loadable/component';
import ScopedShell from './scopedShell';
import { loadLottie } from './behaviors/load-lottie.ts'; 

const Frontpage = loadable(() => import('./frontPage.jsx'));
const DynamicThemeRoute = loadable(() => import('./dynamic-app/dynamic-app-ssr/dynamic-theme.route.tsx'));

export default function App() {
  useEffect(() => {
    // Eagerly load Lottie right after hydration; stays in its own async chunk.
    loadLottie();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<ScopedShell><Frontpage /></ScopedShell>} />
      <Route path="/home" element={<ScopedShell><Frontpage /></ScopedShell>} />
      {/* No ScopedShell here to avoid #main-shell wrapper */}
      <Route path="/dynamic-theme/*" element={<DynamicThemeRoute />} />
    </Routes>
  );
}
