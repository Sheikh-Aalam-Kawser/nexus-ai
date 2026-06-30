import { useState, useEffect, useRef } from "react";
import { useAppStore } from "../store";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar, 
  Play, 
  CheckCircle2, 
  Terminal, 
  Activity, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  RefreshCw,
  Sparkles,
  Zap,
  Check,
  Cpu,
  BookmarkCheck,
  Lock,
  ChevronRight,
  ListTodo
} from "lucide-react";
import { toast } from "sonner";

export default function TaskPlanPage() {
  const { 
    tasks, 
    proposedPlan, 
    approvedPlan, 
    planStatus, 
    generateProposedPlan, 
    approvePlan, 
    updatePlanItemStatus,
    addPlanExecutionLog,
    syncToCalendar,
    sendProgressEmail,
    draftGoogleDoc,
    user
  } = useAppStore();

  const [isPatrolling, setIsPatrolling] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll terminal logs to bottom when updated
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [approvedPlan?.executionLogs]);

  // Keep track of prompted missed items to avoid repeating toasts
  const promptedMissedItems = useRef<Set<string>>(new Set());

  // Adaptation Agent: Adjusts to changing schedule circumstances by detecting and prompting for missed blocks
  useEffect(() => {
    if (!approvedPlan || planStatus !== 'executing') return;

    const intervalId = setInterval(() => {
      const now = new Date();

      approvedPlan.items.forEach(item => {
        if (item.status === 'pending' || item.status === 'in-progress') {
          // If we already prompted for this, skip
          if (promptedMissedItems.current.has(item.id)) return;

          const parts = item.timeSlot.split('-');
          const endStr = parts.length > 1 ? parts[1] : null;
          if (endStr) {
            const match = endStr.trim().match(/(\d+):(\d+)\s*(am|pm)/i);
            if (match) {
              let [_, h, m, ampm] = match;
              let hours = parseInt(h, 10);
              const mins = parseInt(m, 10);
              if (ampm.toLowerCase() === 'pm' && hours < 12) hours += 12;
              if (ampm.toLowerCase() === 'am' && hours === 12) hours = 0;
              
              let d = new Date(item.date);
              if (isNaN(d.getTime())) {
                d = new Date();
                if (item.date.toLowerCase().includes('tomorrow')) {
                  d.setDate(d.getDate() + 1);
                }
              }
              d.setHours(hours, mins, 0, 0);
              
              if (now.getTime() > d.getTime()) {
                promptedMissedItems.current.add(item.id);
                
                toast(`Missed Focus Block: ${item.taskTitle}`, {
                  description: "Did you miss this focus block?",
                  icon: <Activity className="w-4 h-4" />,
                  duration: Infinity, // Keep it open until user acts
                  action: {
                    label: "Yes, skip it",
                    onClick: () => {
                      addPlanExecutionLog(`Adaptation Agent: User confirmed missed block for "${item.taskTitle}". Skipping...`);
                      updatePlanItemStatus(item.id, 'skipped');
                    }
                  },
                  cancel: {
                    label: "No, I did it",
                    onClick: () => {
                      addPlanExecutionLog(`Adaptation Agent: User completed block for "${item.taskTitle}".`);
                      updatePlanItemStatus(item.id, 'completed');
                    }
                  }
                });
              }
            }
          }
        }
      });

    }, 60000); // Evaluates schedule changes every 60 seconds

    return () => clearInterval(intervalId);
  }, [approvedPlan, planStatus, addPlanExecutionLog, updatePlanItemStatus]);

  // Patrol simulation using real APIs
  const handleTriggerPatrol = async () => {
    if (!approvedPlan) return;
    setIsPatrolling(true);
    addPlanExecutionLog("Execution Agent initiated real-world sync protocol...");

    try {
      // 1. Calendar Sync
      await syncToCalendar();

      // 2. Draft an outline for the first pending task
      const firstPending = approvedPlan.items.find(i => i.status === 'pending');
      if (firstPending) {
        const docTitle = `Outline: ${firstPending.taskTitle}`;
        const docContent = `Objective: ${approvedPlan.objective}\n\nTask: ${firstPending.taskTitle}\nDescription: ${firstPending.description}\n\nNotes:\n- Need to research main points.\n- Check constraints.\n- Draft initial thoughts.`;
        await draftGoogleDoc(docTitle, docContent);
      }

      // 3. Send Progress Email to User
      if (user && user.email) {
        await sendProgressEmail(user.email);
      } else {
        addPlanExecutionLog("Skipping email update: No user email configured.");
      }

      toast.success("Execution Agent patrol completed successfully with Real APIs!");
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during API execution patrol.");
      addPlanExecutionLog("API Execution Patrol encountered errors.");
    } finally {
      setIsPatrolling(false);
    }
  };

  const handleGenerateClick = async () => {
    if (tasks.filter(t => t.status !== 'completed').length === 0) {
      toast.error("You need at least one pending task to generate an execution plan.");
      return;
    }
    toast.info("NEXUS Planning Agent is synthesizing a realistic timeline...");
    await generateProposedPlan();
    approvePlan();
    toast.success("Timeline successfully generated and execution agent is active.");
  };

  const handleStartPlanClick = () => {
    approvePlan();
    toast.success("Multi-agent plan approved! Execution agent is now active.");
  };

  const pendingTasksCount = tasks.filter(t => t.status !== 'completed').length;

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
              Cooperative Multi-Agent System
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight mt-3 font-sans">
            Autonomous Focus Planner
          </h1>
          <p className="text-base text-slate-500 mt-2 font-medium max-w-2xl">
            Let the planning and execution agents design and maintain your daily timeline constraint-free.
          </p>
        </div>

        {/* Current State Indicator */}
        <div className="flex items-center gap-3">
          {planStatus === 'idle' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-xs font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
              Planner Offline
            </div>
          )}
          {planStatus === 'generating' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 text-xs font-mono">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Synthesizing Schedule...
            </div>
          )}
          {planStatus === 'proposed' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Awaiting Approval
            </div>
          )}
          {planStatus === 'executing' && (
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-500/20 text-xs font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                Agent Executing
              </div>
              <button
                onClick={async () => {
                  try {
                    if (!document.fullscreenElement) {
                      await document.documentElement.requestFullscreen();
                      toast.success("Deep Work Lock-in activated. Distractions minimized.", { icon: <Lock className="w-4 h-4 text-emerald-500"/> });
                      addPlanExecutionLog("User engaged Deep Work browser lock-in mode.");
                    } else {
                      await document.exitFullscreen();
                      toast("Deep Work Lock-in deactivated.");
                      addPlanExecutionLog("User disengaged Deep Work mode.");
                    }
                  } catch (err) {
                    toast.error("Fullscreen API not supported or blocked by browser.");
                  }
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 hover:bg-indigo-500/20 text-xs font-mono transition-colors"
                title="Toggle browser Full Screen Deep Work mode"
              >
                <Lock className="w-3.5 h-3.5" />
                Deep Work
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Area: Proposed Timeline or Active Focus Schedule (8 Columns) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* 1. IDLE STATE: No plan drafted yet */}
          {planStatus === 'idle' && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[400px]"
            >
              <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
                <Calendar className="h-8 w-8 text-indigo-600" />
              </div>
              
              <h3 className="text-lg font-medium text-slate-900 font-mono">
                Initialize Planning Sequence
              </h3>
              <p className="text-slate-500 text-sm max-w-md mt-2 mb-8">
                The NEXUS Planning Agent will analyze your pending tasks, deadlines, priorities, and subtask dependencies to establish a hyper-optimized timeline where every task completes before its deadline.
              </p>

              {pendingTasksCount === 0 ? (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs font-mono text-amber-400 flex items-center gap-1.5 bg-amber-500/5 px-4 py-2 rounded-xl border border-amber-500/10">
                    <AlertCircle className="h-4 w-4" />
                    Please create at least one pending task first in order to generate a plan.
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleGenerateClick}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm px-6 py-3 rounded-full transition-all duration-200 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/25 active:scale-[0.98]"
                >
                  <Sparkles className="h-4 w-4 text-indigo-200 animate-pulse" />
                  <span>Draft Multi-Agent Schedule</span>
                </button>
              )}
            </motion.div>
          )}

          {/* 2. GENERATING STATE: Loading Feedback */}
          {planStatus === 'generating' && (
            <div className="bg-white border border-slate-200/60 rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[400px] shadow-sm">
              <div className="relative mb-6">
                <div className="h-16 w-16 rounded-full border-2 border-indigo-500/10 border-t-indigo-400 animate-spin flex items-center justify-center" />
                <Cpu className="h-6 w-6 text-indigo-600 absolute inset-0 m-auto animate-pulse" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 font-mono animate-pulse">
                SENSING ENVIRONMENTAL STATE...
              </h3>
              <p className="text-slate-500 text-xs font-mono max-w-sm mt-2 leading-relaxed">
                [Planning Agent] Mapping task durations against active deadlines. Correcting priority overlap weights. Designing Do-Not-Disturb peaks...
              </p>
            </div>
          )}

          {/* 3. PROPOSED STATE: Handled automatically */}
          {planStatus === 'proposed' && proposedPlan && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-6"
            >
              <div className="bg-gradient-to-r from-amber-500/10 to-indigo-500/5 border border-amber-500/20 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 bg-amber-500/5 px-2.5 py-1 rounded-full border border-amber-500/10">
                    Draft Multi-Agent Schedule Synthesized
                  </span>
                  <h3 className="text-base font-medium text-slate-900 mt-2.5 font-mono">
                    Plan Objective: {proposedPlan.objective}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    This sequence distributes your focus time across all pending issues. Activating autonomously...
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* 4. EXECUTING/APPROVED STATE: Live Schedule Controls */}
          {planStatus === 'executing' && approvedPlan && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-6"
            >
              {/* Active Plan Header */}
              <div className="bg-white border border-slate-200/60 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-600 bg-emerald-500/5 border border-emerald-500/20 px-2 py-0.5 rounded">
                      ACTIVE SYSTEM TIMELINE
                    </span>
                    <h3 className="text-base font-semibold text-slate-900 mt-2 font-mono">
                      Objective: {approvedPlan.objective}
                    </h3>
                  </div>

                  <button
                    onClick={handleGenerateClick}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-700 transition-all"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Recalculate Plan</span>
                  </button>
                </div>
              </div>

              {/* Timeline Blocks */}
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-mono text-slate-500 uppercase tracking-widest pl-2">
                  Scheduled Tasks & Subtask Milestones
                </h4>

                <div className="space-y-3">
                  {approvedPlan.items.map((item, idx) => {
                    const isCompleted = item.status === 'completed';
                    const isSkipped = item.status === 'skipped';
                    
                    // Is this the first pending item? (This is our active focus block!)
                    const firstPendingIndex = approvedPlan.items.findIndex(i => i.status === 'pending');
                    const isActiveFocus = firstPendingIndex === idx;

                    return (
                      <div 
                        key={item.id}
                        className={`group rounded-xl p-4 flex gap-4 transition-all border ${
                          isActiveFocus 
                            ? "bg-slate-100/30 border-indigo-500/30 shadow-md shadow-indigo-500/5 ring-1 ring-indigo-500/10" 
                            : isCompleted 
                              ? "bg-white/50 border-slate-200/80 opacity-60" 
                              : "bg-white border-slate-200/80 hover:border-slate-700/80"
                        }`}
                      >
                        {/* Interactive Status Indicator Node */}
                        <div className="flex flex-col items-center">
                          {isCompleted ? (
                            <button 
                              onClick={() => updatePlanItemStatus(item.id, 'pending')}
                              className="h-8 w-8 rounded-full bg-emerald-100 border border-emerald-500/30 text-emerald-600 flex items-center justify-center transition-colors hover:bg-slate-100 hover:text-slate-500 hover:border-slate-200"
                              title="Mark as pending"
                            >
                              <Check className="h-4.5 w-4.5" />
                            </button>
                          ) : isSkipped ? (
                            <button 
                              onClick={() => updatePlanItemStatus(item.id, 'pending')}
                              className="h-8 w-8 rounded-full bg-slate-50 border border-slate-200 text-slate-500 flex items-center justify-center font-mono text-[10px] hover:text-slate-900"
                              title="Mark as pending"
                            >
                              SKP
                            </button>
                          ) : (
                            <button 
                              onClick={() => updatePlanItemStatus(item.id, 'completed')}
                              className={`h-8 w-8 rounded-full border flex items-center justify-center transition-all ${
                                isActiveFocus 
                                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 hover:bg-emerald-200 hover:text-emerald-600 hover:border-emerald-500" 
                                  : "bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800"
                              }`}
                              title="Mark complete"
                            >
                              {isActiveFocus ? (
                                <Zap className="h-4 w-4 text-indigo-600 group-hover:text-emerald-600 animate-pulse" />
                              ) : (
                                <div className="h-2 w-2 rounded-full bg-slate-600 group-hover:bg-indigo-400" />
                              )}
                            </button>
                          )}
                          {idx < approvedPlan.items.length - 1 && (
                            <div className={`w-px flex-1 my-2 ${isActiveFocus ? "bg-indigo-500/20" : "bg-slate-200"}`} />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center flex-wrap gap-2">
                              <span className={`text-xs font-semibold ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                                {item.taskTitle}
                              </span>
                              {item.subtaskTitle && (
                                <>
                                  <ChevronRight className="h-3 w-3 text-slate-600" />
                                  <span className="text-[10px] font-mono text-indigo-600 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                                    {item.subtaskTitle}
                                  </span>
                                </>
                              )}
                              {isActiveFocus && (
                                <span className="text-[9px] font-mono uppercase bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 px-2 py-0.5 rounded animate-pulse">
                                  ACTIVE FOCUS
                                </span>
                              )}
                              {isCompleted && (
                                <span className="text-[9px] font-mono uppercase bg-emerald-100 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded">
                                  COMPLETED
                                </span>
                              )}
                            </div>
                            <p className={`text-xs mt-1.5 ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-500'}`}>
                              {item.description}
                            </p>
                          </div>

                          {/* Controls / Info */}
                          <div className="flex items-center gap-4 text-right">
                            <div className="flex flex-col items-end font-mono">
                              <span className="text-xs text-slate-700 flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-indigo-600/80" />
                                {item.timeSlot}
                              </span>
                              <span className="text-[10px] text-slate-500 mt-0.5">
                                {item.date} • {item.durationMinutes}m focus block
                              </span>
                            </div>

                            {/* Actions toggle */}
                            {!isCompleted && !isSkipped && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => updatePlanItemStatus(item.id, 'skipped')}
                                  className="p-1 px-2 rounded hover:bg-slate-100 border border-transparent hover:border-slate-200 text-[10px] font-mono text-slate-500 hover:text-slate-700 transition-colors"
                                >
                                  Skip
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

        </div>

        {/* Right Area: Execution Agent Console & Controls (4 Columns) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Execution Agent Status Console */}
          <div className="bg-white border border-slate-200/60 rounded-3xl p-8 flex flex-col gap-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="h-4.5 w-4.5 text-emerald-600" />
                <span className="text-xs font-semibold font-mono tracking-tight text-slate-900">
                  EXECUTION AGENT
                </span>
              </div>
              <span className={`h-2 w-2 rounded-full ${planStatus === 'executing' ? 'bg-emerald-400 animate-ping' : 'bg-slate-700'}`} />
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              This secondary agent acts as the system executor: patrolling schedule deadlines, syncing states, and keeping focus alignment intact.
            </p>

            {planStatus === 'executing' && approvedPlan ? (
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleTriggerPatrol}
                  disabled={isPatrolling}
                  className="w-full inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-slate-900 border border-slate-200 hover:border-slate-700 py-2.5 rounded-xl text-xs font-mono transition-colors disabled:opacity-50"
                >
                  <Activity className={`h-3.5 w-3.5 text-emerald-600 ${isPatrolling ? 'animate-spin' : ''}`} />
                  <span>{isPatrolling ? "AGENT DEPLOYED..." : "TRIGGER MANUAL AGENT PATROL"}</span>
                </button>
              </div>
            ) : (
              <div className="bg-slate-50/40 border border-slate-200/60 rounded-xl p-4 text-center">
                <Lock className="h-4.5 w-4.5 text-slate-600 mx-auto mb-2" />
                <span className="text-[10px] font-mono text-slate-500 uppercase">
                  Awaiting Plan Activation
                </span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
