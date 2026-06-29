import { useAppStore } from "@/store";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { 
  User, 
  Mail, 
  Sliders, 
  Sparkles, 
  ArrowLeft, 
  ListTodo, 
  RefreshCw, 
  LogOut,
  TrendingUp,
  Award,
  BookOpen,
  LayoutDashboard
} from "lucide-react";
import { isPast } from "date-fns";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Profile() {
  const navigate = useNavigate();
  const { 
    tasks, 
    user, 
    insights,
    setInsights
  } = useAppStore();

  const [isGenerating, setIsGenerating] = useState(false);

  // Derive task states
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const totalTasksCount = tasks.length;
  const completedTasksCount = completedTasks.length;
  const completionPercentage = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;
  const overdueTasksCount = tasks.filter(t => t.status !== 'completed' && t.deadline && isPast(new Date(t.deadline))).length;

  const handleReflect = async () => {
    setIsGenerating(true);
    toast.loading("Analyzing productivity patterns...", { id: 'reflect' });
    try {
      const res = await fetch('/api/agents/reflect', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ completedTasks })
      });
      if (!res.ok) { 
        const errData = await res.json().catch(() => ({})); 
        throw new Error(errData.error || "Failed to analyze patterns."); 
      }
      const data = await res.json();
      
      setInsights(data.insights || []);
      toast.success("Insights successfully generated", { id: 'reflect' });
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : "Failed to generate insights", { id: 'reflect' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6 pb-24 space-y-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/20 via-transparent to-transparent min-h-screen">
      {/* ----------------- HEADER & NAVIGATION ----------------- */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors mb-2 font-mono"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Plan
          </button>
          <h1 className="text-3xl font-light text-white tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
            Strategic Identity
          </h1>
          <p className="text-sm text-slate-400 mt-1">Manage user information, productivity metrics, and AI recommendations.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Session
          </div>
        </div>
      </header>

      {/* ----------------- MAIN LAYOUT GRID ----------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Profile Information */}
        <Card className="bg-[#111113]/60 border-slate-800 p-6 rounded-2xl flex flex-col justify-between space-y-6 md:col-span-1">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 ring-1 ring-emerald-500/20">
                <User className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-mono text-slate-400 uppercase tracking-wider">User Details</h3>
                <p className="text-xs text-slate-500">Active NEXUS Guardian account</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1 bg-slate-950/40 p-3 rounded-xl border border-slate-900">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono flex items-center gap-1">
                  <User className="h-3 w-3 text-slate-400" /> Display Name
                </span>
                <span className="text-sm font-medium text-slate-200 block truncate">
                  {user?.displayName || "NEXUS User"}
                </span>
              </div>

              <div className="space-y-1 bg-slate-950/40 p-3 rounded-xl border border-slate-900">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono flex items-center gap-1">
                  <Mail className="h-3 w-3 text-slate-400" /> Email Address
                </span>
                <span className="text-sm font-medium text-slate-200 block truncate" title={user?.email}>
                  {user?.email || "No email linked"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-emerald-950/10 border border-emerald-500/10 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5" />
              Security Active
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Your session is authenticated securely via Firebase. Task metadata and focus stats are persisted locally on this device.
            </p>
          </div>
        </Card>

        {/* Right Side: Productivity Momentum & Insights (taking up 2 columns) */}
        <div className="space-y-6 md:col-span-2">
          {/* Productivity Momentum Component (Relocated) */}
          <Card className="bg-[#111113]/60 border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2 max-w-sm">
              <h2 className="text-lg font-medium text-slate-200 flex items-center gap-2">
                <Sliders className="h-4.5 w-4.5 text-emerald-400" />
                Productivity Momentum
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your deadline guardian metrics. Breaking tasks into micro-steps increases completion consistency. Use voice commands anytime to add tasks hands-free.
              </p>
            </div>

            <div className="grid grid-cols-3 sm:flex sm:flex-1 sm:max-w-md sm:justify-around items-center gap-4 w-full">
              <div className="text-center">
                <span className="block text-2xl font-light text-slate-100">{totalTasksCount}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Total Tasks</span>
              </div>
              
              <div className="text-center">
                <span className="block text-2xl font-light text-emerald-400">{completedTasksCount}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Completed</span>
              </div>

              <div className="text-center">
                <span className="block text-2xl font-light text-red-400">{overdueTasksCount}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Overdue</span>
              </div>

              <div className="col-span-3 sm:flex-1 sm:max-w-[150px] w-full space-y-2 mt-2 sm:mt-0">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                  <span>Productivity Bar</span>
                  <span className="text-emerald-400 font-semibold">{Math.round(completionPercentage)}%</span>
                </div>
                
                {/* Segmented Productivity Bar */}
                <div className="flex gap-1.5 h-3 items-center">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const threshold = (i + 1) * 10;
                    const isActive = completionPercentage >= threshold;
                    return (
                      <motion.div
                        key={i}
                        className={`flex-1 h-full rounded-sm transition-all duration-300 ${
                          isActive 
                            ? "bg-gradient-to-t from-emerald-600 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                            : "bg-slate-900 border border-slate-800/80"
                        }`}
                        initial={{ scaleY: 0.8 }}
                        animate={{ scaleY: isActive ? 1.1 : 0.9 }}
                        whileHover={{ scaleY: 1.2 }}
                      />
                    );
                  })}
                </div>

                {/* Performance Label */}
                <div className="text-[10px] text-right font-mono text-slate-400">
                  {completionPercentage === 100 && <span className="text-teal-400">Elite Completion</span>}
                  {completionPercentage < 100 && completionPercentage >= 75 && <span className="text-emerald-400">Highly Productive</span>}
                  {completionPercentage < 75 && completionPercentage >= 50 && <span className="text-cyan-400">Steady Pacing</span>}
                  {completionPercentage < 50 && completionPercentage >= 25 && <span className="text-amber-400">Building Focus</span>}
                  {completionPercentage < 25 && <span className="text-slate-500">Initializing Pace</span>}
                </div>
              </div>
            </div>
          </Card>

          {/* AI Insights and Tips Section */}
          <Card className="bg-[#111113]/60 border-slate-800 p-6 rounded-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-4">
              <div className="space-y-1">
                <h2 className="text-lg font-medium text-slate-200 flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-pink-500" />
                  AI Cognitive Insights
                </h2>
                <p className="text-xs text-slate-400">
                  NEXUS analyzes your historical workflows and priority parameters to refine execution pacing.
                </p>
              </div>

              <Button 
                onClick={handleReflect} 
                disabled={isGenerating || completedTasksCount === 0}
                variant="outline"
                className="font-mono text-xs text-pink-400 hover:text-pink-300 border-pink-500/20 hover:bg-pink-500/5 rounded-full px-4 shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isGenerating ? 'animate-spin' : ''}`} />
                Analyze Workload
              </Button>
            </div>

            {insights && insights.length > 0 ? (
              <div className="space-y-4">
                {insights.map((insight, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-900 leading-relaxed text-sm text-slate-300"
                  >
                    <div className="h-6 w-6 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-400 shrink-0 mt-0.5">
                      <TrendingUp className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-pink-400 font-semibold block mb-0.5">Tip {idx + 1}</span>
                      <p className="text-xs text-slate-300 leading-normal">{insight}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 bg-slate-950/20 rounded-xl border border-dashed border-slate-800/80">
                <BookOpen className="h-7 w-7 text-slate-600" />
                <div className="space-y-1">
                  <p className="text-xs text-slate-300 font-medium">No behavioral patterns diagnosed</p>
                  <p className="text-[11px] text-slate-500 max-w-sm leading-normal">
                    {completedTasksCount > 0 
                      ? "You have completed tasks! Trigger the cognitive diagnostics to receive strategic suggestions." 
                      : "Complete at least one task in focus mode or your schedule to feed the AI diagnostics engine."}
                  </p>
                </div>
                {completedTasksCount > 0 && (
                  <Button 
                    size="sm" 
                    onClick={handleReflect}
                    disabled={isGenerating}
                    className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-mono rounded-full px-4"
                  >
                    Diagnose Workload Patterns
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
