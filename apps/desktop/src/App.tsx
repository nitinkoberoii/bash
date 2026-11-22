import React, { useState, useEffect } from 'react';
import { PROJECT_NAME, APP_METADATA } from '@bash/shared';

export const App: React.FC = () => {
  const [apiReady, setApiReady] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.bashAPI) return;
    setApiReady(true);

    const unsubInteractive = window.bashAPI.onInteractiveToggle((interactive) => {
      setIsInteractive(interactive);
    });

    const unsubTrigger = window.bashAPI.onManualTrigger(() => {
      setFeedbackToast('⚡ Manual Hint Triggered (Ctrl+Shift+Space)');
      setTimeout(() => setFeedbackToast(null), 2500);
    });

    const unsubClear = window.bashAPI.onClearContext(() => {
      setFeedbackToast('🧹 Conversation Context Flushed (Ctrl+Shift+X)');
      setTimeout(() => setFeedbackToast(null), 2500);
    });

    return () => {
      unsubInteractive();
      unsubTrigger();
      unsubClear();
    };
  }, []);

  return (
    <div className="w-full h-full p-2 flex flex-col justify-start items-center bg-transparent">
      {/* Floating HUD Card */}
      <div
        className={`w-full bg-slate-900/90 border ${
          isInteractive
            ? 'border-sky-500/80 shadow-sky-500/10'
            : 'border-slate-700/60 shadow-black/40'
        } rounded-xl p-3.5 shadow-2xl backdrop-blur-md text-slate-100 flex flex-col gap-2.5 transition-colors duration-200`}
      >
        {/* Top Status Bar & Drag Region */}
        <div
          className="flex items-center justify-between select-none"
          style={isInteractive ? ({ WebkitAppRegion: 'drag' } as React.CSSProperties) : undefined}
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isInteractive ? 'bg-sky-400' : 'bg-emerald-400'
              } animate-pulse`}
            />
            <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-300">
              {PROJECT_NAME}
            </span>
          </div>

          <div
            className="flex items-center gap-1.5"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            {isInteractive ? (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 animate-pulse">
                INTERACTIVE (Draggable)
              </span>
            ) : (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                LOCKED (Click-Through)
              </span>
            )}
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              STEALTH
            </span>
          </div>
        </div>

        {/* Transient Hotkey Feedback Banner */}
        {feedbackToast && (
          <div className="bg-sky-950/80 border border-sky-500/40 text-sky-200 text-[11px] px-2.5 py-1 rounded-md text-center font-medium animate-fadeIn">
            {feedbackToast}
          </div>
        )}

        {/* Content Preview (Scan-Optimized Technical Hint) */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 text-xs flex flex-col gap-1.5 select-none">
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
            <span>Interview Topic: Distributed System Design</span>
            <span className="text-[10px] text-slate-500">Live</span>
          </div>
          <ul className="space-y-1 text-slate-200 text-[11px] list-disc list-inside">
            <li>
              <strong className="text-sky-300">Approach:</strong> Partition by user hash with
              consistent hashing rings.
            </li>
            <li>
              <strong className="text-sky-300">Concurrency:</strong> Atomic CAS fixed-window rate
              limiter for LLM protection.
            </li>
            <li>
              <strong className="text-sky-300">Edge Cases:</strong> Hotspot node mitigation via
              virtual vnodes.
            </li>
          </ul>
        </div>

        {/* Footer info & hotkey hints */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-slate-800/60">
          <span className="truncate max-w-[280px]">
            {isInteractive
              ? 'Press Ctrl+Shift+I to lock (click-through)'
              : 'Ctrl+Shift+I: unlock • Ctrl+Shift+H: hide'}
          </span>
          <span>
            v{APP_METADATA.version} • {apiReady ? '✓' : '...'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default App;
