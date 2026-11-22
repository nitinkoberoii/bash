import React, { useState, useEffect } from 'react';
import { OverlayHUD } from './components/OverlayHUD';

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
    <OverlayHUD apiReady={apiReady} isInteractive={isInteractive} feedbackToast={feedbackToast} />
  );
};

export default App;
