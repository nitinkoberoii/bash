import React, { useState, useEffect } from 'react';
import { PROJECT_NAME, APP_METADATA } from '@bash/shared';

export const App: React.FC = () => {
  const [count, setCount] = useState(0);
  const [apiReady, setApiReady] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.bashAPI) {
      setApiReady(true);
    }
  }, []);

  return (
    <div className="w-full h-screen p-4 flex flex-col justify-center items-center bg-slate-950">
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-5 shadow-2xl backdrop-blur-md max-w-sm w-full text-center">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Milestone 1.1 Live
          </span>
          <span className="text-xs text-slate-400">v{APP_METADATA.version}</span>
        </div>

        <h1 className="text-lg font-bold text-slate-100 tracking-tight">{PROJECT_NAME} Overlay</h1>
        <p className="text-xs text-slate-400 mt-1 mb-4">
          Electron Bridge: {apiReady ? '✓ Connected' : 'Waiting for Bridge'}
        </p>

        <div className="flex items-center justify-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => setCount((c) => c + 1)}
            className="px-3 py-1.5 text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white rounded transition shadow cursor-pointer"
          >
            HMR Test Counter: {count}
          </button>
        </div>

        <p className="text-[10px] text-slate-500">
          Hot Module Replacement Active • Single-Instance Lock Enforced
        </p>
      </div>
    </div>
  );
};

export default App;
