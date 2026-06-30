import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { toast } from 'sonner';
import { ShieldAlert, AlertOctagon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function DistractionBlocker() {
  const { emergencyMode } = useAppStore();
  const [violationActive, setViolationActive] = useState(false);

  useEffect(() => {
    if (!emergencyMode) return;

    // Simulate extension communication for actual blocking
    window.postMessage({ type: 'NEXUS_ENABLE_BLOCKER', domains: ['facebook.com', 'twitter.com', 'x.com', 'youtube.com', 'reddit.com', 'instagram.com'] }, '*');

    return () => {
      window.postMessage({ type: 'NEXUS_DISABLE_BLOCKER' }, '*');
    };
  }, [emergencyMode]);

  return (
    <AnimatePresence>
      {violationActive && emergencyMode && (
        <motion.div 
          key="blocker-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-red-950/95 backdrop-blur-xl"
        >
          <AlertOctagon className="h-32 w-32 text-red-500 mb-8 animate-pulse" />
          <h1 className="text-5xl font-black text-red-500 tracking-widest uppercase mb-4 text-center">
            Distraction Blocked
          </h1>
          <p className="text-red-300 text-xl text-center max-w-2xl px-6">
            Emergency mode is active. You attempted to navigate away or lose focus from the workspace. Social media and non-essential apps are restricted.
          </p>
          <p className="text-red-400/50 text-sm mt-4 font-mono">
            * NEXUS Extension is actively blocking external domains *
          </p>
          <button 
            onClick={() => {
              setViolationActive(false);
              toast.success("Focus regained. Stay on task.");
            }}
            className="mt-12 px-10 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full transition-colors text-lg"
          >
            I WILL FOCUS
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
