import { useAppStore } from "@/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { VoiceOrb } from "@/components/VoiceOrb";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Clock, 
  CheckCircle2, 
  Circle, 
  Bot, 
  Network,
  AlertTriangle, 
  Check, 
  Plus, 
  Brain, 
  Key, 
  Star, 
  Sliders, 
  ShieldAlert, 
  Play, 
  Flame, 
  Sparkles,
  ListTodo,
  Mail,
  Calendar,
  Zap,
  RotateCw,
  SlidersHorizontal,
  User
} from "lucide-react";
import { Task } from "@/types";
import { format, isPast, formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

// Real-time Countdown Timer for Focus Task
function DeadlineTimer({ deadlineStr }: { deadlineStr: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      const difference = +new Date(deadlineStr) - +new Date();
      if (difference <= 0) {
        setIsOverdue(true);
        const overdueMs = Math.abs(difference);
        const hours = Math.floor(overdueMs / (1000 * 60 * 60));
        const minutes = Math.floor((overdueMs / 1000 / 60) % 60);
        const seconds = Math.floor((overdueMs / 1000) % 60);
        setTimeLeft(`Overdue by ${hours}h ${minutes}m ${seconds}s`);
        return;
      }
      
      setIsOverdue(false);
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);
      
      let str = "";
      if (days > 0) str += `${days}d `;
      if (hours > 0 || days > 0) str += `${hours}h `;
      str += `${minutes}m ${seconds}s`;
      setTimeLeft(str);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [deadlineStr]);

  return (
    <div className={`font-mono text-lg font-bold px-3 py-1.5 rounded-lg border tracking-wide ${
      isOverdue 
        ? 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse' 
        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    }`}>
      {timeLeft}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { 
    tasks, 
    user, 
    updateTask, 
    addTask, 
    primaryFocusTaskId,
    setPrimaryFocusTaskId,
    emergencyMode,
    setEmergencyMode
  } = useAppStore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', deadline: '' });
  const [expandedAgentLogs, setExpandedAgentLogs] = useState<Record<string, boolean>>({});

  // States for Perceive, Plan, and Act requirements
  const [activeNudge, setActiveNudge] = useState<{ message: string; suggestedAction: string } | null>(null);
  const [isFetchingNudge, setIsFetchingNudge] = useState(false);
  const [activeActionType, setActiveActionType] = useState<'email' | 'calendar' | 'local' | null>(null);
  const [actionOutput, setActionOutput] = useState<string>("");
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [isOrchestrating, setIsOrchestrating] = useState(false);

  // Derive task states
  const pendingTasks = tasks.filter(t => t.status !== 'completed').sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
  const completedTasks = tasks.filter(t => t.status === 'completed');
  
  // Calculate Progress Indicator statistics
  const totalTasksCount = tasks.length;
  const completedTasksCount = completedTasks.length;
  const completionPercentage = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;
  const overdueTasksCount = tasks.filter(t => t.status !== 'completed' && t.deadline && isPast(new Date(t.deadline))).length;

  // Auto-detect high urgency deadlines (less than 12 hours remaining) to recommend Emergency Mode
  const hasImminentDeadline = tasks.some(t => {
    if (t.status === 'completed' || !t.deadline) return false;
    const diffHours = (new Date(t.deadline).getTime() - Date.now()) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours < 12;
  });

  // Find the primary focus task if it is set and still pending
  const focusTask = tasks.find(t => t.id === primaryFocusTaskId && t.status !== 'completed');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.deadline) {
      toast.error("Title and deadline are required");
      return;
    }
    addTask({
      id: crypto.randomUUID(),
      userId: user?.uid || 'user',
      title: newTask.title,
      description: newTask.description,
      deadline: new Date(newTask.deadline).toISOString(),
      status: 'pending',
      urgency: 5,
      impact: 5,
      effort: 5,
      priorityScore: 5.0,
      subtasks: [],
      focusBlocks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setNewTask({ title: '', description: '', deadline: '' });
    setIsAddOpen(false);
    toast.success("Task created. AI auto-prioritizer initiated!");
  };

  const getPriorityColor = (score: number = 0) => {
    if (score >= 8) return "bg-red-500/10 text-red-500 border-red-500/20";
    if (score >= 5) return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  };

  const handleDecompose = async (task: Task) => {
    toast.loading("Decomposing task...", { id: 'decompose' });
    try {
      const res = await fetch('/api/agents/decompose', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: task.title, description: task.description, deadline: task.deadline })
      });
      if (!res.ok) { const errData = await res.json().catch(() => ({})); throw new Error(errData.error || "API error"); }
      const data = await res.json();
      
      updateTask(task.id, {
        subtasks: data.subtasks || [],
        urgency: data.urgency,
        impact: data.impact,
        effort: data.effort,
        priorityScore: (data.urgency * 0.4) + (data.impact * 0.3) + (1/Math.max(data.effort, 1) * 0.1),
        agentLogs: data.agentLogs
      });
      toast.success("Task decomposed into actionable steps", { id: 'decompose' });
    } catch (e: any) {
      const errMsg = e instanceof Error ? e.message : String(e);
      toast.error(e instanceof Error ? e.message : "Failed to decompose task", { id: 'decompose' });
    }
  };

  const handleSchedule = async (task: Task) => {
    toast.loading("Finding Focus Blocks...", { id: 'schedule' });
    try {
      const res = await fetch('/api/agents/schedule', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task, subtasks: task.subtasks })
      });
      if (!res.ok) { const errData = await res.json().catch(() => ({})); throw new Error(errData.error || "API error"); }
      const data = await res.json();
      
      updateTask(task.id, { focusBlocks: data });
      toast.success("Focus blocks scheduled", { id: 'schedule' });
    } catch (e: any) {
      const errMsg = e instanceof Error ? e.message : String(e);
      toast.error(e instanceof Error ? e.message : "Failed to schedule task", { id: 'schedule' });
    }
  };

  const handleReflect = async () => {
    toast.loading("Analyzing productivity...", { id: 'reflect' });
    try {
      const res = await fetch('/api/agents/reflect', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ completedTasks })
      });
      if (!res.ok) { const errData = await res.json().catch(() => ({})); throw new Error(errData.error || "API error"); }
      const data = await res.json();
      
      useAppStore.getState().setInsights(data.insights || []);
      toast.success("Insights generated", { id: 'reflect' });
    } catch (e: any) {
      const errMsg = e instanceof Error ? e.message : String(e);
      toast.error(e instanceof Error ? e.message : "Failed to generate insights", { id: 'reflect' });
    }
  };

  const handleReEnterFocusMode = () => {
    const sortedPending = tasks
      .filter(t => t.status !== 'completed')
      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
    if (sortedPending.length > 0) {
      setPrimaryFocusTaskId(sortedPending[0].id);
      toast.success(`"${sortedPending[0].title}" set as Primary Focus Task!`);
    } else {
      toast.error("No pending tasks available to set as primary focus.");
    }
  };

  // 1. Perceive: Dynamic context nudge based on current hour & remaining subtasks
  useEffect(() => {
    if (!focusTask) {
      setActiveNudge(null);
      return;
    }

    const fetchNudge = async () => {
      setIsFetchingNudge(true);
      try {
        const res = await fetch('/api/agents/nudge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            task: focusTask,
            userState: {
              timeOfDay: new Date().toLocaleTimeString(),
              urgency: focusTask.urgency || 5,
              effort: focusTask.effort || 5,
              subtasksLeft: (focusTask.subtasks || []).filter(s => !s.completed).length
            }
          })
        });
        if (!res.ok) throw new Error("Nudge error");
        const data = await res.json();
        if (data.message) {
          setActiveNudge({
            message: data.message,
            suggestedAction: data.suggestedAction || "Take action immediately."
          });
        }
      } catch (err) {
        console.warn("Failed to fetch AI nudge, using local heuristic.", err);
        const hoursLeft = (new Date(focusTask.deadline).getTime() - Date.now()) / (1000 * 60 * 60);
        let msg = `Ensure to break down "${focusTask.title}" and address its key deliverables.`;
        let action = "Decompose the task or begin tackling high-impact planning blocks.";
        if (hoursLeft > 0 && hoursLeft < 12) {
          msg = `Critical countdown: only ${Math.round(hoursLeft)} hours remain for "${focusTask.title}". Engage high-focus tactics.`;
          action = "Activate emergency mode and tackle core subtasks.";
        }
        setActiveNudge({ message: msg, suggestedAction: action });
      } finally {
        setIsFetchingNudge(false);
      }
    };

    fetchNudge();
  }, [focusTask?.id]);

  // 2. Plan: Manual/Automated Orchestrator run
  const handleGlobalOrchestrate = async () => {
    setIsOrchestrating(true);
    toast.loading("Running Global AI Orchestrator...", { id: 'orchestrate' });
    try {
      await useAppStore.getState().triggerAutoAIPlan();
      toast.success("AI Global Orchestrator updated all task priorities!", { id: 'orchestrate' });
    } catch (err) {
      toast.error("Failed to run Global Orchestrator.", { id: 'orchestrate' });
    } finally {
      setIsOrchestrating(false);
    }
  };

  // 3. Act: Autonomous actions execution drafts
  const handleRunAction = async (actionType: 'email' | 'calendar' | 'local') => {
    if (!focusTask) return;
    setIsExecutingAction(true);
    setActionOutput("");
    try {
      const res = await fetch('/api/agents/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          actionType,
          details: {
            taskTitle: focusTask.title,
            taskDescription: focusTask.description,
            deadline: focusTask.deadline,
            subtasks: focusTask.subtasks || []
          }
        })
      });
      if (!res.ok) throw new Error("Execution Agent error");
      const data = await res.json();
      
      setActionOutput(data.generatedContent || "Action prepared successfully.");
      setActiveActionType(actionType);
      toast.success(`Action payload drafted by NEXUS!`);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to prepare automation draft.");
      let fallback = "";
      if (actionType === 'email') {
        fallback = `Subject: Progress Update on ${focusTask.title}\n\nHi team,\n\nI am currently working on "${focusTask.title}". Here are the active planning steps I'm focused on:\n${(focusTask.subtasks || []).map(s => `- ${s.title} (${s.completed ? 'Done' : 'Pending'})`).join('\n')}\n\nI am tracking towards the deadline: ${new Date(focusTask.deadline).toLocaleString()}.\n\nBest regards,\nUser`;
      } else if (actionType === 'calendar') {
        fallback = `Calendar Block for ${focusTask.title}\n\nDescription: Dedicated focus session to execute pending steps:\n${(focusTask.subtasks || []).map(s => `- ${s.title}`).join('\n')}`;
      } else {
        fallback = `System Manifest: Task focus blocks execution trigger initiated.\n- Title: ${focusTask.title}\n- Deadline: ${new Date(focusTask.deadline).toLocaleString()}`;
      }
      setActionOutput(fallback);
      setActiveActionType(actionType);
    } finally {
      setIsExecutingAction(false);
    }
  };

  // 4. Act: Email Client dispatch
  const triggerMailto = () => {
    if (!focusTask) return;
    let subject = `Progress Update: ${focusTask.title}`;
    let body = actionOutput;
    
    const subjectMatch = actionOutput.match(/^Subject:\s*(.*)$/m);
    if (subjectMatch) {
      subject = subjectMatch[1];
      body = actionOutput.replace(/^Subject:\s*.*$/m, "").trim();
    }
    
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    toast.success("Opened native mail client!");
  };

  // 5. Act: Google Calendar Template link trigger
  const triggerGoogleCalendar = () => {
    if (!focusTask) return;
    const title = focusTask.title;
    const detailsStr = actionOutput;
    const dateObj = new Date(focusTask.deadline);
    const dateFormatted = dateObj.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const startObj = new Date(dateObj.getTime() - 60 * 60 * 1000);
    const startFormatted = startObj.toISOString().replace(/-|:|\.\d\d\d/g, "");
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startFormatted}/${dateFormatted}&details=${encodeURIComponent(detailsStr)}`;
    window.open(url, '_blank');
    toast.success("Google Calendar event draft opened!");
  };

  // 6. Act: Local ICS File generator download
  const triggerICSDownload = () => {
    if (!focusTask) return;
    const title = focusTask.title;
    const dateObj = new Date(focusTask.deadline);
    const startObj = new Date(dateObj.getTime() - 60 * 60 * 1000);
    
    const formatDateICS = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//NEXUS Deadline Guardian//EN
BEGIN:VEVENT
UID:${focusTask.id}
DTSTAMP:${formatDateICS(new Date())}
DTSTART:${formatDateICS(startObj)}
DTEND:${formatDateICS(dateObj)}
SUMMARY:${title}
DESCRIPTION:${actionOutput.replace(/\n/g, '\\n')}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}_focus_block.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Focus block event ICS file downloaded successfully!");
  };

  const { insights } = useAppStore();

  return (
    <div className="mx-auto max-w-5xl p-6 pb-24 space-y-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/20 via-transparent to-transparent min-h-screen">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Today's Plan</h1>
          <p className="text-sm text-slate-400">Welcome back. You have {pendingTasks.length} pending tasks today.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Emergency Mode Manual Toggle */}
          <Button 
            variant="outline" 
            onClick={() => {
              setEmergencyMode(!emergencyMode);
              toast(emergencyMode ? "Emergency Mode disengaged." : "Emergency Mode engaged! Focus solely on high-priority deadlines.", {
                icon: <ShieldAlert className={emergencyMode ? "text-slate-400" : "text-red-500 animate-pulse"} />
              });
            }}
            className={`transition-all border font-mono text-xs rounded-full px-4 h-9 ${
              emergencyMode 
                ? 'bg-red-500/10 text-red-400 border-red-500/40 hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                : 'text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className={`h-4 w-4 mr-1.5 ${emergencyMode ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
            Emergency
          </Button>

          {/* Plan: Global AI Orchestrator */}
          <Button 
            variant="outline" 
            onClick={handleGlobalOrchestrate} 
            disabled={isOrchestrating}
            className="text-amber-500 hover:text-amber-400 border-amber-500/20 hover:bg-amber-500/10 h-9 rounded-full px-4 text-xs font-medium font-mono"
          >
            <RotateCw className={`h-4 w-4 mr-1.5 ${isOrchestrating ? 'animate-spin' : ''}`} />
            Orchestrate Plan
          </Button>

          {/* Create Task Modal Button */}
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full px-5 cursor-pointer">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Task
            </DialogTrigger>
            <DialogContent className="bg-[#111113] border border-slate-800 text-slate-100 sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-light" style={{ fontFamily: "'Georgia', serif" }}>Create New Task</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddTask} className="space-y-5 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-[10px] uppercase tracking-widest text-slate-500">Task Title</Label>
                  <Input id="title" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="bg-slate-900 border-slate-800 focus-visible:ring-emerald-500 text-slate-100" placeholder="e.g. Complete quarterly report" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-[10px] uppercase tracking-widest text-slate-500">Description</Label>
                  <Textarea id="description" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="bg-slate-900 border-slate-800 focus-visible:ring-emerald-500 text-slate-100 placeholder:text-slate-700" placeholder="Brief details about the task..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline" className="text-[10px] uppercase tracking-widest text-slate-500">Deadline</Label>
                  <Input id="deadline" type="datetime-local" value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} className="bg-slate-900 border-slate-800 focus-visible:ring-emerald-500 text-slate-100 [color-scheme:dark]" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)} className="hover:bg-slate-800 text-slate-400">Cancel</Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white">Create Task</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* ----------------- EMERGENCY MODE OVERVIEW & ACTIONS ----------------- */}
      {emergencyMode && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="bg-gradient-to-r from-red-950/40 via-[#111113] to-red-950/40 border border-red-500/30 p-6 rounded-2xl space-y-4 shadow-[0_0_30px_rgba(239,68,68,0.08)]"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 animate-pulse">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-red-400 font-semibold tracking-tight text-base">Emergency Defense engaged</h3>
              <p className="text-xs text-slate-300">Strict triage mode. AI recommends prioritizing tasks by hard deadlines immediately.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEmergencyMode(false)} className="text-xs text-slate-500 hover:text-white ml-auto font-mono">
              Dismiss Mode
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="bg-slate-950/50 p-4 rounded-xl border border-red-500/10 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-red-400">Tactics 01</span>
              <h4 className="text-sm font-semibold text-slate-200">Postpone Non-Essentials</h4>
              <p className="text-xs text-slate-400">Ignore tasks without a deadline today. Postpone any low score priorities.</p>
            </div>
            <div className="bg-slate-950/50 p-4 rounded-xl border border-red-500/10 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-red-400">Tactics 02</span>
              <h4 className="text-sm font-semibold text-slate-200">Engage Pomodoro Loops</h4>
              <p className="text-xs text-slate-400">Select your Primary Focus Task below and do not switch until completed.</p>
            </div>
            <div className="bg-slate-950/50 p-4 rounded-xl border border-red-500/10 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-red-400">Tactics 03</span>
              <h4 className="text-sm font-semibold text-slate-200">Decompose First</h4>
              <p className="text-xs text-slate-400">If a complex task paralyzes you, AI autonomously breaks it down into immediate steps.</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Auto Emergency Mode Suggestion banner */}
      {!emergencyMode && hasImminentDeadline && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-xs text-slate-300">
              <strong className="text-amber-400">Urgent deadline approaching!</strong> You have pending tasks expiring in less than 12 hours. AI recommends enabling Emergency Mode.
            </p>
          </div>
          <Button 
            onClick={() => setEmergencyMode(true)}
            size="sm" 
            className="bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs rounded-full shrink-0"
          >
            Activate Emergency Mode
          </Button>
        </motion.div>
      )}

      {/* ----------------- PRIMARY FOCUS TASK MODE PANEL ----------------- */}
      {focusTask ? (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-[#15151a] border border-amber-500/30 rounded-2xl p-6 space-y-4 shadow-[0_0_20px_rgba(245,158,11,0.05)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-widest font-mono text-amber-500 flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-500" /> Primary Focus Task
              </span>
              <h2 className="text-xl font-semibold text-slate-100">{focusTask.title}</h2>
              <p className="text-xs text-slate-400 max-w-2xl">{focusTask.description || "No description provided."}</p>
            </div>
            
            {/* Real-time deadline countdown */}
            {focusTask.deadline && (
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500">Timer to Deadline</span>
                <DeadlineTimer deadlineStr={focusTask.deadline} />
              </div>
            )}
          </div>

          {/* Perceive: Dynamic AI Nudge Block */}
          {focusTask && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex gap-3 items-start"
            >
              <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
                <Brain className="h-4 w-4" />
              </div>
              <div className="space-y-1 w-full">
                <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-500 font-semibold block">NEXUS Perceive Engine</span>
                {activeNudge && <p className="text-xs text-slate-300 leading-normal mb-2">{activeNudge.message}</p>}
                
                <div className="flex flex-col gap-1 text-[11px] text-emerald-400 font-mono bg-emerald-950/20 p-2.5 rounded border border-emerald-500/10">
                  <span className="font-bold uppercase text-[9px] tracking-wide text-emerald-500">Ongoing Subtask:</span>
                  {focusTask.subtasks && focusTask.subtasks.filter(s => !s.completed).length > 0 ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-slate-200 font-sans text-xs">
                        {focusTask.subtasks.find(s => !s.completed)?.title}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({focusTask.subtasks.find(s => !s.completed)?.estimatedMinutes}m)
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 font-sans text-xs italic">
                      {focusTask.subtasks && focusTask.subtasks.length > 0 
                        ? "All subtasks completed! Complete the main task below." 
                        : "No subtasks generated yet. Please trigger AI Task Decomposition."}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Subtask Quick Completion & Decomposition Box */}
          <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Network className="h-3.5 w-3.5 text-pink-400" /> Task Decomposition & Subtasks
              </span>
              {focusTask.priorityScore !== undefined && (
                <Badge variant="outline" className={getPriorityColor(focusTask.priorityScore)}>
                  Priority {(focusTask.priorityScore).toFixed(1)}
                </Badge>
              )}
            </div>

            {focusTask.subtasks && focusTask.subtasks.length > 0 ? (
              <div className="space-y-4">
                {(() => {
                  const activeSubtasks = focusTask.subtasks || [];
                  const totalSubtasks = activeSubtasks.length;
                  const completedSubtasks = activeSubtasks.filter(s => s.completed).length;
                  const subPercentage = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
                  const radius = 32;
                  const circumference = 2 * Math.PI * radius;
                  const offset = circumference - (subPercentage / 100) * circumference;

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      {/* Circular Progress Bar Component */}
                      <div className="md:col-span-4 flex flex-col items-center justify-center bg-slate-900/40 p-4 rounded-xl border border-slate-800/60 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                        <div className="relative h-24 w-24 flex items-center justify-center">
                          <svg className="absolute -rotate-90 w-full h-full" viewBox="0 0 80 80">
                            <circle
                              cx="40"
                              cy="40"
                              r={radius}
                              className="text-slate-800/80"
                              strokeWidth="5"
                              stroke="currentColor"
                              fill="transparent"
                            />
                            <motion.circle
                              cx="40"
                              cy="40"
                              r={radius}
                              className="text-pink-500"
                              strokeWidth="5"
                              strokeDasharray={circumference}
                              initial={{ strokeDashoffset: circumference }}
                              animate={{ strokeDashoffset: offset }}
                              transition={{ duration: 0.5, ease: "easeInOut" }}
                              strokeLinecap="round"
                              stroke="currentColor"
                              fill="transparent"
                            />
                          </svg>
                          <div className="flex flex-col items-center justify-center text-center">
                            <span className="text-lg font-bold text-slate-100 tracking-tight">
                              {Math.round(subPercentage)}%
                            </span>
                            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mt-0.5">
                              Done
                            </span>
                          </div>
                        </div>
                        <div className="text-center mt-2.5">
                          <span className="text-xs font-mono text-slate-400">
                            {completedSubtasks} / {totalSubtasks} Subtasks
                          </span>
                        </div>
                      </div>

                      {/* Subtask checklist */}
                      <div className="md:col-span-8 space-y-3">
                        <div className="grid gap-2.5">
                          {focusTask.subtasks.map((sub, i) => (
                            <div key={i} className="flex items-center gap-3 text-sm py-1 border-b border-slate-900/40 last:border-0">
                              <button 
                                onClick={() => {
                                  const newSubs = [...(focusTask.subtasks || [])];
                                  newSubs[i].completed = !newSubs[i].completed;
                                  updateTask(focusTask.id, { subtasks: newSubs });
                                  toast.success(`Updated subtask "${sub.title}" status.`);
                                }}
                                className="text-slate-500 hover:text-emerald-400 transition-colors shrink-0"
                              >
                                {sub.completed ? <CheckCircle2 className="h-4.5 w-4.5 text-[#15803D]" /> : <Circle className="h-4.5 w-4.5 text-slate-600" />}
                              </button>
                              <span className={`flex-1 transition-all ${sub.completed ? 'text-slate-500 line-through decoration-slate-600' : 'text-slate-200'}`}>
                                {sub.title}
                              </span>
                              <span className="text-xs font-mono text-slate-500 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800/60">{sub.estimatedMinutes}m</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {focusTask.agentLogs && (
                  <div className="pt-3 border-t border-slate-800/60 mt-3">
                    <button
                      onClick={() => setExpandedAgentLogs(prev => ({ ...prev, [focusTask.id]: !prev[focusTask.id] }))}
                      className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium font-mono transition-colors"
                    >
                      <Bot className="h-3.5 w-3.5" />
                      {expandedAgentLogs[focusTask.id] ? 'Hide Agent Collaboration Logs' : 'View Agent Collaboration Logs'}
                    </button>
                    {expandedAgentLogs[focusTask.id] && (
                      <div className="mt-3 space-y-3 bg-slate-950 border border-slate-850 rounded-lg p-4 text-xs max-h-72 overflow-y-auto">
                        <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1.5 text-[10px] uppercase font-mono tracking-wider text-slate-400">
                          <Network className="h-3 w-3 text-cyan-400 animate-pulse" />
                          <span>Multi-Agent Collaboration Board</span>
                        </div>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <div className="font-mono text-[10px] text-cyan-400 font-semibold uppercase">
                              👁️ Perceiving agent
                            </div>
                            <p className="text-slate-300 leading-relaxed pl-3 border-l border-cyan-500/20">{focusTask.agentLogs.perceivingAgentLog}</p>
                          </div>
                          <div className="space-y-1">
                            <div className="font-mono text-[10px] text-indigo-400 font-semibold uppercase">
                              ⚖️ Prioritizing agent
                            </div>
                            <p className="text-slate-300 leading-relaxed pl-3 border-l border-indigo-500/20">{focusTask.agentLogs.prioritizingAgentLog}</p>
                          </div>
                          <div className="space-y-1">
                            <div className="font-mono text-[10px] text-pink-400 font-semibold uppercase">
                              🧩 Decomposing Agent
                            </div>
                            <p className="text-slate-300 leading-relaxed pl-3 border-l border-pink-500/20">{focusTask.agentLogs.decomposingAgentLog}</p>
                          </div>
                          <div className="space-y-1">
                            <div className="font-mono text-[10px] text-amber-400 font-semibold uppercase">
                              🗺️ Planning agent
                            </div>
                            <p className="text-slate-300 leading-relaxed pl-3 border-l border-amber-500/20">{focusTask.agentLogs.planningAgentLog}</p>
                          </div>
                          <div className="space-y-1">
                            <div className="font-mono text-[10px] text-emerald-400 font-semibold uppercase">
                              🤖 Autonomous task automation agent
                            </div>
                            <p className="text-slate-300 leading-relaxed pl-3 border-l border-emerald-500/20">{focusTask.agentLogs.autonomousAutomationLog}</p>
                          </div>
                          <div className="space-y-1">
                            <div className="font-mono text-[10px] text-purple-400 font-semibold uppercase">
                              👑 Orchestrating agent
                            </div>
                            <p className="text-slate-300 leading-relaxed pl-3 border-l border-purple-500/20">{focusTask.agentLogs.orchestratingAgentLog}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-3 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                <Sparkles className="h-5 w-5 text-pink-500 animate-pulse" />
                <div className="space-y-1">
                  <p className="text-xs text-slate-300 font-medium">No steps generated yet</p>
                  <p className="text-[11px] text-slate-500 max-w-xs leading-normal">
                    Use the NEXUS Multi-Agent Orchestrator to analyze and decompose this task.
                  </p>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => handleDecompose(focusTask)}
                  className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-mono rounded-full px-4 h-8"
                >
                  <Bot className="h-3.5 w-3.5 mr-1.5" />
                  Decompose Task Now
                </Button>
              </div>
            )}
          </div>

          {/* Act: Autonomous Task Automations */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-mono tracking-widest text-blue-400 font-semibold flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 fill-blue-400" /> NEXUS Action Chamber
                </span>
                <h4 className="text-xs font-semibold text-slate-200">Autonomous Task Automations</h4>
                <p className="text-[11px] text-slate-400">Execute real-world communications and calendar bookings based on this task.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleRunAction('email')}
                disabled={isExecutingAction}
                className="bg-slate-900 border-slate-850 text-slate-300 hover:text-white hover:bg-slate-800 text-[11px] flex items-center justify-center gap-1.5 h-8"
              >
                <Mail className="h-3 w-3 text-blue-400" />
                Draft Progress Email
              </Button>

              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleRunAction('calendar')}
                disabled={isExecutingAction}
                className="bg-slate-900 border-slate-850 text-slate-300 hover:text-white hover:bg-slate-800 text-[11px] flex items-center justify-center gap-1.5 h-8"
              >
                <Calendar className="h-3 w-3 text-amber-400" />
                Sync Calendar event
              </Button>

              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleRunAction('local')}
                disabled={isExecutingAction}
                className="bg-slate-900 border-slate-850 text-slate-300 hover:text-white hover:bg-slate-800 text-[11px] flex items-center justify-center gap-1.5 h-8"
              >
                <SlidersHorizontal className="h-3 w-3 text-emerald-400" />
                Generate ICS block
              </Button>
            </div>

            {isExecutingAction && (
              <div className="flex items-center gap-2 py-1 text-[11px] text-slate-500 font-mono animate-pulse">
                <RotateCw className="h-3 w-3 animate-spin" /> Preparing AI action payload...
              </div>
            )}

            {activeActionType && actionOutput && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-slate-950 border border-slate-850 rounded-lg p-3.5 space-y-2.5 mt-2"
              >
                <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400">
                    Drafted {activeActionType === 'email' ? 'Email Payload' : activeActionType === 'calendar' ? 'Calendar Event' : 'Task Manifest'}
                  </span>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[8px] font-mono font-normal py-0 px-1">
                    Ready
                  </Badge>
                </div>
                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto bg-slate-900/30 p-2 rounded border border-slate-950">
                  {actionOutput}
                </pre>
                
                <div className="flex items-center justify-end gap-2 pt-1">
                  {activeActionType === 'email' && (
                    <Button 
                      size="sm"
                      onClick={triggerMailto}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] h-7 rounded-full font-mono font-medium"
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      Dispatch Draft to Email
                    </Button>
                  )}
                  {activeActionType === 'calendar' && (
                    <Button 
                      size="sm"
                      onClick={triggerGoogleCalendar}
                      className="bg-amber-600 hover:bg-amber-500 text-white text-[11px] h-7 rounded-full font-mono font-medium"
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      Save to Google Cal
                    </Button>
                  )}
                  {activeActionType === 'local' && (
                    <Button 
                      size="sm"
                      onClick={triggerICSDownload}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] h-7 rounded-full font-mono font-medium"
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Download ICS File
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setActiveActionType(null); setActionOutput(""); }}
                    className="text-[10px] text-slate-500 hover:text-slate-300 font-mono h-7"
                  >
                    Clear
                  </Button>
                </div>
              </motion.div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button 
              size="sm" 
              onClick={() => {
                updateTask(focusTask.id, { status: 'completed' });
                setPrimaryFocusTaskId(null);
                toast.success("Hooray! Focus task completed successfully.");
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs rounded-full"
            >
              <Check className="h-4 w-4 mr-1.5" />
              Complete Task
            </Button>
          </div>
        </motion.div>
      ) : (
        <Card className="bg-slate-950/20 border border-dashed border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
          <Star className="h-6 w-6 text-slate-600" />
          <div>
            <h3 className="text-sm font-semibold text-slate-300">No primary focus</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-0.5 mb-3">No active task is currently in focus mode.</p>
          </div>
          <Button 
            onClick={handleReEnterFocusMode}
            className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono rounded-full px-5 h-8 flex items-center gap-1.5"
          >
            <Star className="h-3.5 w-3.5 fill-white" />
            Re-enter Focus Mode
          </Button>
        </Card>
      )}

      <VoiceOrb />
    </div>
  );
}
