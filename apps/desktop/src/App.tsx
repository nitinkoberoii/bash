import React, { useState, useEffect } from 'react';
import { PROJECT_NAME, APP_METADATA } from '@bash/shared';

export const App: React.FC = () => {
  const [apiReady, setApiReady] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.bashAPI) {
      setApiReady(true);
    }
  }, []);

  return (
    <div className="w-full h-full p-2 flex flex-col justify-start items-center bg-transparent">
      {/* Floating HUD Card */}
      <div className="w-full bg-slate-900/85 border border-slate-700/60 rounded-xl p-3.5 shadow-2xl backdrop-blur-md text-slate-100 flex flex-col gap-2.5">
        {/* Top Status Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-300">
              {PROJECT_NAME}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              LOCKED (Click-Through)
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/25">
              STEALTH (Excluded)
            </span>
          </div>
        </div>

        {/* Content Preview (Scan-Optimized Technical Hint) */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 text-xs flex flex-col gap-1.5">
          <div className="text-[11px] text-slate-400 font-medium">
            Waiting for interview question...
          </div>
          <ul className="space-y-1 text-slate-200 text-[11px] list-disc list-inside">
            <li>
              <strong className="text-sky-300">Approach:</strong> Maintain a rolling ring buffer of
              transcript utterances.
            </li>
            <li>
              <strong className="text-sky-300">Stealth:</strong> DWM omits overlay buffer from
              screen-capture APIs.
            </li>
            <li>
              <strong className="text-sky-300">Latency:</strong> Sub-second Time-to-First-Hint
              target (&lt;2.5s ceiling).
            </li>
          </ul>
        </div>

        {/* Footer info & hotkey hints */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-slate-800/60">
          <span>Bridge: {apiReady ? '✓ Active' : 'Connecting'}</span>
          <span>v{APP_METADATA.version}</span>
        </div>
      </div>
    </div>
  );
};

export default App;
