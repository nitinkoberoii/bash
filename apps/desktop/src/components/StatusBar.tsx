import React from 'react';
import { PROJECT_NAME } from '@bash/shared';

export interface StatusBarProps {
  apiReady: boolean;
  isInteractive: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ apiReady, isInteractive }) => {
  return (
    <div className="flex items-center justify-between select-none">
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${
            apiReady ? (isInteractive ? 'bg-neutral-200' : 'bg-emerald-400') : 'bg-amber-400'
          } animate-pulse`}
        />
        <span className="text-[11px] font-semibold tracking-wide uppercase text-neutral-300">
          {PROJECT_NAME}
        </span>
      </div>

      <div
        className="flex items-center gap-1.5"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {isInteractive ? (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/10 text-neutral-100 border border-white/20 animate-pulse">
            INTERACTIVE (Draggable)
          </span>
        ) : (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            LOCKED (Click-Through)
          </span>
        )}
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#202020] text-neutral-300 border border-white/10">
          STEALTH
        </span>
      </div>
    </div>
  );
};

export default StatusBar;
