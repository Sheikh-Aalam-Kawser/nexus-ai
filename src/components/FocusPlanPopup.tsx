import { X, Clock, Zap } from "lucide-react";
import { useAppStore } from "../store";
import { motion, AnimatePresence } from "motion/react";

export function FocusPlanPopup() {
  const { 
    isFocusPlanPopupVisible, 
    setFocusPlanPopupVisible, 
    approvedPlan, 
    planStatus 
  } = useAppStore();

  if (!isFocusPlanPopupVisible) return null;

  return (
    <AnimatePresence>
      {isFocusPlanPopupVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 right-6 w-80 bg-white border border-slate-200/80 shadow-2xl rounded-2xl overflow-hidden z-50 flex flex-col"
        >
          {/* Header */}
          <div className="bg-slate-100/50 p-4 border-b border-slate-200/60 flex flex-col relative">
            <span className="text-[10px] font-mono text-emerald-600 font-semibold tracking-wider flex items-center gap-1.5">
              <Zap className="h-3 w-3 animate-pulse" />
              EXECUTION AGENT ACTIVE
            </span>
            <span className="text-slate-900 text-sm font-semibold mt-1 pr-6">Autonomous Plan Generated</span>
            
            <button
              onClick={() => setFocusPlanPopupVisible(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-slate-200/80 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 max-h-[300px] overflow-y-auto">
            {planStatus === 'executing' && approvedPlan ? (
              <div className="space-y-3">
                {(approvedPlan.items || []).slice(0, 3).map((item, idx) => (
                  <div key={item.id} className={`p-3 rounded-xl flex items-start gap-3 border ${idx === 0 ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-slate-100/30 border-slate-200/50'}`}>
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-mono mt-0.5 ${idx === 0 ? 'bg-indigo-500/20 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className={`text-xs font-semibold ${idx === 0 ? 'text-slate-900' : 'text-slate-700'}`}>
                        {item.taskTitle}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 mt-1">
                        <Clock className="h-3 w-3" />
                        {item.timeSlot}
                      </div>
                    </div>
                  </div>
                ))}
                {(approvedPlan.items || []).length > 3 && (
                  <div className="text-center text-[10px] font-mono text-slate-500 pt-2">
                    + {(approvedPlan.items || []).length - 3} more items...
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-500 text-center py-4 font-mono animate-pulse">
                Synthesizing plan...
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
