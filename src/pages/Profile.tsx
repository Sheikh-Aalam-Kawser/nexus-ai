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
import { motion } from "motion/react";

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
    <div className="mx-auto max-w-5xl p-6 pb-24 space-y-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-200/50 via-transparent to-transparent min-h-screen">
      {/* ----------------- HEADER & NAVIGATION ----------------- */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 transition-colors mb-2 font-mono"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Plan
          </button>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight mt-2">
            Strategic Identity
          </h1>
          <p className="text-base text-slate-500 mt-2 font-medium">Manage user information, productivity metrics, and AI recommendations.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-500/20 text-xs font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Session
          </div>
        </div>
      </header>

      {/* ----------------- MAIN LAYOUT GRID ----------------- */}
      <div className="max-w-md mx-auto">
        <Card className="bg-white border-slate-200/60 p-8 rounded-3xl flex flex-col justify-between space-y-6 shadow-sm hover:shadow-md transition-shadow group">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 ring-1 ring-emerald-500/20">
                <User className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-mono text-slate-500 uppercase tracking-wider">User Details</h3>
                <p className="text-xs text-slate-500">Active NEXUS Guardian account</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1 bg-slate-50/40 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono flex items-center gap-1">
                  <User className="h-3 w-3 text-slate-500" /> Display Name
                </span>
                <span className="text-sm font-medium text-slate-800 block truncate">
                  {user?.displayName || "NEXUS User"}
                </span>
              </div>

              <div className="space-y-1 bg-slate-50/40 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono flex items-center gap-1">
                  <Mail className="h-3 w-3 text-slate-500" /> Email Address
                </span>
                <span className="text-sm font-medium text-slate-800 block truncate" title={user?.email}>
                  {user?.email || "No email linked"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-emerald-950/10 border border-emerald-500/10 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5" />
              Security Active
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Your session is authenticated securely via Firebase. Task metadata and focus stats are persisted locally on this device.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
