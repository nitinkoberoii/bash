import React from 'react';
import { APP_METADATA } from '@bash/shared';
import { StatusBar } from './StatusBar';

export interface OverlayHUDProps {
  apiReady: boolean;
  isInteractive: boolean;
  feedbackToast: string | null;
}

export const OverlayHUD: React.FC<OverlayHUDProps> = ({
  apiReady,
  isInteractive,
  feedbackToast,
}) => {
  return (
    <div className="w-full h-full p-2 flex flex-col justify-start items-center bg-transparent">
      {/* Floating HUD Card: Transparent Dark IDE Theme (#181818 with backdrop blur) */}
      <div
        className={`w-full bg-[#181818]/90 border ${
          isInteractive ? 'border-neutral-500/80 shadow-white/5' : 'border-white/10 shadow-black/60'
        } rounded-xl p-3.5 shadow-2xl backdrop-blur-md text-neutral-100 flex flex-col gap-2.5 transition-colors duration-200`}
      >
        {/* Top Header & Drag Handle Region */}
        <div
          style={
            isInteractive
              ? ({
                  WebkitAppRegion: 'drag',
                  cursor: 'grab',
                } as React.CSSProperties)
              : undefined
          }
        >
          <StatusBar apiReady={apiReady} isInteractive={isInteractive} />
        </div>

        {/* Transient Hotkey Feedback Banner */}
        {feedbackToast && (
          <div className="bg-[#242424] border border-white/15 text-neutral-200 text-[11px] px-2.5 py-1 rounded-md text-center font-medium animate-fadeIn">
            {feedbackToast}
          </div>
        )}

        {/* Scan-Optimized Technical Hint Body */}
        <div className="bg-[#121212]/85 border border-white/5 rounded-lg p-2.5 text-xs flex flex-col gap-1.5 select-none">
          <div className="text-[11px] text-neutral-400 font-medium flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Topic: Distributed System Design</span>
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">Live Session</span>
          </div>

          <ul className="space-y-1.5 text-neutral-200 text-[11px] list-disc list-inside">
            <li>
              <strong className="text-white font-medium">Approach:</strong> Partition with
              consistent hashing rings (Murmur3 / Ketama) to minimize rebalancing keys on scale-out.
            </li>
            <li>
              <strong className="text-white font-medium">Concurrency:</strong> Atomic CAS
              fixed-window rate limiter guarding upstream LLM tokens under high concurrent bursts.
            </li>
            <li>
              <strong className="text-white font-medium">Complexity:</strong> $O(1)$ amortized
              lookup with virtual vnodes ($V = 256$) mitigating hotspot skew.
            </li>
            <li>
              <strong className="text-white font-medium">Edge Cases:</strong> Split-brain network
              partitions resolved via quorum consensus ($W + R &gt; N$).
            </li>
          </ul>
        </div>

        {/* Footer Bar: Hotkey Help & Platform Telemetry */}
        <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-0.5 border-t border-white/5 select-none">
          <span className="truncate max-w-[280px]">
            {isInteractive
              ? 'Press Ctrl+Shift+I to lock (click-through)'
              : 'Ctrl+Shift+I: unlock/drag • Ctrl+Shift+H: hide'}
          </span>
          <span className="font-mono text-neutral-500">
            v{APP_METADATA.version} • {apiReady ? 'IPC OK' : 'Connecting'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OverlayHUD;
