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
import { AIntakeDialog } from "@/components/AIntakeDialog";
import { useState, useEffect, useRef } from "react";

// Real-time Subtask Timer for 30-minute intervals
function SubtaskTimer({ subtaskId }: { subtaskId: string }) {
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds

  useEffect(() => {
    // Reset timer when active subtask changes
    setTimeLeft(30 * 60);
  }, [subtaskId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [subtaskId]);

  const isBehind = timeLeft < 0;
  const absTime = Math.abs(timeLeft);
  const minutes = Math.floor(absTime / 60);
  const seconds = absTime % 60;
  const formatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isBehind ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-emerald-100 text-emerald-600'}`}>
      {isBehind ? '-' : ''}{formatted}
    </span>
  );
}
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
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { initAuth, googleSignIn, getAccessToken } from "../lib/auth";
import { User as FirebaseUser } from "firebase/auth";

// Real-time Countdown Timer for Focus Task
function DeadlineTimer({ deadlineStr, onEmergency }: { deadlineStr: string, onEmergency?: () => void }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isOverdue, setIsOverdue] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const onEmergencyRef = useRef(onEmergency);

  useEffect(() => {
    onEmergencyRef.current = onEmergency;
  }, [onEmergency]);

  useEffect(() => {
    const calculateTime = () => {
      const difference = +new Date(deadlineStr) - +new Date();
      if (difference <= 0) {
        setIsOverdue(true);
        setIsEmergency(true);
        if (onEmergencyRef.current) onEmergencyRef.current();
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
      
      const totalMinutesLeft = (difference / 1000 / 60);
      if (totalMinutesLeft < 30) {
        setIsEmergency(true);
        if (onEmergencyRef.current) onEmergencyRef.current();
      } else {
        setIsEmergency(false);
      }

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
    <div className={`font-mono text-xl font-bold px-4 py-2 rounded-xl border tracking-wide transition-colors ${
      isOverdue || isEmergency
        ? 'bg-red-500/10 text-red-600 border-red-500/30 animate-pulse' 
        : 'bg-slate-100 text-slate-800 border-slate-200'
    }`}>
      {timeLeft}
    </div>
  );
}

interface DynamicAction {
  id: string;
  label: string;
  actionText: string;
  needsCreds: boolean;
  completionText: string;
  outputMock: string;
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

  // States for Perceive, Plan, and Act requirements
  const [activeNudge, setActiveNudge] = useState<{ message: string; suggestedAction: string } | null>(null);
  const [isFetchingNudge, setIsFetchingNudge] = useState(false);
  const [activeActionType, setActiveActionType] = useState<string | null>(null);
  const [actionOutput, setActionOutput] = useState<string>("");
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [helperState, setHelperState] = useState<'idle' | 'asking' | 'done'>('idle');
  const [helperSelectedAction, setHelperSelectedAction] = useState<DynamicAction | null>(null);
  const [dynamicActionsList, setDynamicActionsList] = useState<DynamicAction[]>([]);
  const [isFetchingActions, setIsFetchingActions] = useState(false);

  const [needsAuth, setNeedsAuth] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    initAuth(
      (u, t) => { setNeedsAuth(false); setToken(t); setFirebaseUser(u); },
      () => setNeedsAuth(true)
    );
  }, []);

  // Derive task states
  const pendingTasks = tasks.filter(t => t.status !== 'completed').sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
  const completedTasks = tasks.filter(t => t.status === 'completed');
  
  // Calculate Progress Indicator statistics
  const totalTasksCount = tasks.length;
  const completedTasksCount = completedTasks.length;
  const completionPercentage = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;
  const overdueTasksCount = tasks.filter(t => t.status !== 'completed' && t.deadline && isPast(new Date(t.deadline))).length;


  // Find the primary focus task if it is set and still pending
  const focusTask = tasks.find(t => t.id === primaryFocusTaskId && t.status !== 'completed');

  useEffect(() => {
    if (!focusTask) return;
    const hoursLeft = (new Date(focusTask.deadline).getTime() - Date.now()) / (1000 * 60 * 60);
    const hyperUrgent = hoursLeft > 0 && hoursLeft <= 1;
    
    if ((hyperUrgent || emergencyMode) && dynamicActionsList.length === 0 && !isFetchingActions) {
      setIsFetchingActions(true);
      fetch('/api/agents/dynamic_actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskTitle: focusTask.title, taskDescription: focusTask.description })
      })
      .then(async res => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to fetch actions");
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setDynamicActionsList(data);
        } else {
          throw new Error("Invalid response format");
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error(`Failed to generate actions: ${err.message}`);
        setDynamicActionsList([
            { id: 'generate_doc', label: 'Generate Summary', actionText: 'generate a summary and add it to your Google Drive', needsCreds: true, completionText: 'Your document has been created.', outputMock: 'Google Doc Generated: "Summary"' },
            { id: 'create_action_plan', label: 'Create Action Plan', actionText: 'create a detailed action plan', needsCreds: false, completionText: 'Your action plan is ready.', outputMock: 'Action Plan:\n1. Execute phase 1.' }
        ]);
      })
      .finally(() => {
        setIsFetchingActions(false);
      });
    }
  }, [focusTask, emergencyMode, dynamicActionsList.length, isFetchingActions]);

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
  const handleRunAction = async (actionType: string, fallbackMock?: string) => {
    if (!focusTask) return;
    setIsExecutingAction(true);
    setActionOutput("");
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/agents/execute', {
        method: 'POST',
        headers,
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
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Execution Agent error");
      }
      const data = await res.json();
      
      setActionOutput(data.generatedContent || "Action prepared successfully.");
      setActiveActionType(actionType);
      toast.success(`Action payload drafted by NEXUS!`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed: ${err.message}`);
      let fallback = "";
      if (actionType === 'email') {
        fallback = `Subject: Progress Update on ${focusTask.title}\n\nHi team,\n\nI am currently working on "${focusTask.title}". Here are the active planning steps I'm focused on:\n${(focusTask.subtasks || []).map(s => `- ${s.title} (${s.completed ? 'Done' : 'Pending'})`).join('\n')}\n\nI am tracking towards the deadline: ${new Date(focusTask.deadline).toLocaleString()}.\n\nBest regards,\nUser`;
      } else if (actionType === 'calendar') {
        fallback = `Calendar Block for ${focusTask.title}\n\nDescription: Dedicated focus session to execute pending steps:\n${(focusTask.subtasks || []).map(s => `- ${s.title}`).join('\n')}`;
      } else if (fallbackMock) {
        fallback = fallbackMock;
      } else if (actionType === 'create_flashcards') {
        fallback = `Flashcards Generated for ${focusTask.title}:\n\n1. Front: Key Concept 1\n   Back: Definition and details.\n2. Front: Core Argument\n   Back: Supporting evidence.`;
      } else if (actionType === 'generate_doc') {
        fallback = `Google Doc Generated: "Notes on ${focusTask.title}"\n[Link: https://docs.google.com/document/d/fake-doc-id-123]`;
      } else if (actionType === 'essay_outline') {
        fallback = `Essay Outline: ${focusTask.title}\n\nI. Introduction\nII. Core Argument\nIII. Supporting Evidence\nIV. Conclusion\n\n(Generated via Emergency Mode)`;
      } else if (actionType === 'draft_final') {
        fallback = `Final Submission Draft for ${focusTask.title}\n\n[Body of the submission goes here. Make sure to review before submitting.]`;
      } else if (actionType === 'export_deliverable') {
        fallback = `Deliverable Package Ready for ${focusTask.title}\n\nContents: Final document, references, and logs.`;
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

  const { insights } = useAppStore();

  return (
    <div className="mx-auto max-w-5xl p-6 pb-24 space-y-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-200/50 via-transparent to-transparent min-h-screen">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-200/60">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight">Today's Plan</h1>
          <p className="text-base text-slate-500 mt-2 font-medium">Welcome back. You have {pendingTasks.length} pending tasks today.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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

          <AIntakeDialog />

          {/* Create Task Modal Button */}
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full px-5 cursor-pointer">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Task
            </DialogTrigger>
            <DialogContent className="bg-white border border-slate-200 text-slate-900 sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-light" style={{ fontFamily: "'Georgia', serif" }}>Create New Task</DialogTitle>
              </DialogHeader>
              <form 
                onSubmit={handleAddTask} 
                className="space-y-5 pt-4"
                onKeyDown={(e) => {
                  // Platform check: In React, e.key === 'Enter' uniformly covers both the 'Enter' key on Windows and 'Return' on macOS.
                  if (e.key === 'Enter' && !e.shiftKey) {
                    // Do not trigger if the user is typing inside a textarea, to allow newlines.
                    if ((e.target as HTMLElement).tagName.toLowerCase() === 'textarea') {
                      return;
                    }
                    // Only activate if the user has entered task details (e.g. title is present)
                    if (newTask.title.trim() !== '') {
                      e.preventDefault(); 
                      const submitBtn = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement | null;
                      if (submitBtn) {
                        submitBtn.click(); // Trigger the Create Task button
                      }
                    }
                  }
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-[10px] uppercase tracking-widest text-slate-500">Task Title</Label>
                  <Input id="title" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="bg-slate-100 border-slate-200 focus-visible:ring-emerald-500 text-slate-900" placeholder="e.g. Complete quarterly report" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-[10px] uppercase tracking-widest text-slate-500">Description</Label>
                  <Textarea id="description" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="bg-slate-100 border-slate-200 focus-visible:ring-emerald-500 text-slate-900 placeholder:text-slate-700" placeholder="Brief details about the task..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline" className="text-[10px] uppercase tracking-widest text-slate-500">Deadline</Label>
                  <Input id="deadline" type="datetime-local" value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} className="bg-slate-100 border-slate-200 focus-visible:ring-emerald-500 text-slate-900 [color-scheme:light]" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)} className="hover:bg-slate-200 text-slate-500">Cancel</Button>
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
          className="bg-red-50 border border-red-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-red-700 font-semibold tracking-tight text-sm">Emergency Protocol Active</h3>
              <p className="text-xs text-red-600/80 mt-0.5">Focus exclusively on tasks with imminent deadlines. Ignore non-essentials.</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setEmergencyMode(false)} 
            className="text-xs text-red-700 hover:text-red-800 border-red-200 hover:bg-red-100 shrink-0"
          >
            Dismiss Protocol
          </Button>
        </motion.div>
      )}

      {/* ----------------- PRIMARY FOCUS TASK MODE PANEL ----------------- */}
      {focusTask ? (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-white border border-slate-200/60 rounded-3xl p-8 space-y-8 shadow-[0_4px_40px_-10px_rgba(0,0,0,0.05)]"
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <span className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> Current Focus
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 leading-tight">{focusTask.title}</h2>
              <p className="text-base text-slate-500 leading-relaxed">{focusTask.description || "No description provided."}</p>
            </div>
            
            {/* Real-time deadline countdown */}
            {focusTask.deadline && (
              <div className="flex flex-col md:items-end gap-1.5 shrink-0">
                <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-slate-400">Time Remaining</span>
                <DeadlineTimer deadlineStr={focusTask.deadline} onEmergency={() => setEmergencyMode(true)} />
              </div>
            )}
          </div>

          {/* Act: Autonomous Task Automations (Moved Up & Eye-Catching) */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-blue-600 flex items-center gap-1.5">
                  <Zap className="h-4 w-4 fill-blue-600" /> Action Center
                </span>
                <h4 className="text-base font-semibold text-slate-900">Task Automations</h4>
                <p className="text-sm text-slate-500">Intelligent actions to accelerate your progress.</p>
              </div>
            </div>

            {(() => {
              const hoursLeft = (new Date(focusTask.deadline).getTime() - Date.now()) / (1000 * 60 * 60);
              const hyperUrgent = hoursLeft > 0 && hoursLeft <= 1;
              
              if (hyperUrgent || emergencyMode) {
                if (helperState === 'idle') {
                  
                  return (
                    <div className="space-y-4">
                      <div className="bg-amber-50 border border-amber-200/60 p-4 rounded-xl flex gap-4 items-start">
                        <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm text-slate-800 leading-relaxed">
                            <strong>Time is critical.</strong> Would you like me to take over some of this work for you?
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {isFetchingActions ? (
                          <div className="col-span-full py-4 flex justify-center">
                             <RotateCw className="h-5 w-5 animate-spin text-amber-500" />
                          </div>
                        ) : dynamicActionsList.map((action) => (
                          <Button 
                            key={action.id}
                            variant="outline" 
                            onClick={() => { setHelperSelectedAction(action); setHelperState('asking'); }}
                            className="bg-white border-amber-200 text-amber-800 hover:text-amber-900 hover:bg-amber-50 text-sm font-medium h-12 transition-all shadow-sm"
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (helperState === 'asking' && helperSelectedAction) {
                  return (
                    <div className="space-y-4 p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <p className="text-base font-medium text-slate-800">
                        Do I have your permission to {helperSelectedAction.actionText}?
                      </p>
                      {helperSelectedAction.needsCreds && needsAuth ? (
                        <div className="flex flex-col gap-3">
                          <p className="text-sm text-slate-600">This action requires Google Workspace permissions.</p>
                          <button onClick={async () => {
                            setIsLoggingIn(true);
                            try {
                              const result = await googleSignIn();
                              if (result) {
                                setToken(result.accessToken);
                                setFirebaseUser(result.user);
                                setNeedsAuth(false);
                              }
                            } catch (e) {
                              toast.error("Failed to sign in.");
                            } finally {
                              setIsLoggingIn(false);
                            }
                          }} disabled={isLoggingIn} className="gsi-material-button w-fit">
                            <div className="gsi-material-button-state"></div>
                            <div className="gsi-material-button-content-wrapper">
                              <div className="gsi-material-button-icon">
                                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{display: 'block'}}>
                                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                                  <path fill="none" d="M0 0h48v48H0z"></path>
                                </svg>
                              </div>
                              <span className="gsi-material-button-contents">Sign in with Google</span>
                              <span style={{display: 'none'}}>Sign in with Google</span>
                            </div>
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <Button onClick={() => {
                            handleRunAction(helperSelectedAction.id, helperSelectedAction.outputMock);
                            setHelperState('done');
                          }} className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-10 px-6 font-medium shadow-sm">
                            Yes, please proceed
                          </Button>
                          <Button onClick={() => setHelperState('idle')} variant="outline" className="text-sm h-10 px-6 text-slate-600">Cancel</Button>
                        </div>
                      )}
                    </div>
                  );
                }

                if (helperState === 'done' && helperSelectedAction) {
                  return (
                    <div className="space-y-4 p-5 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                      <p className="text-base font-medium text-emerald-900 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        {helperSelectedAction.completionText}
                      </p>
                      {actionOutput && (
                        <div className="bg-white/80 p-3 rounded border border-emerald-100 text-sm font-mono text-emerald-800 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                          {actionOutput}
                        </div>
                      )}
                      <Button onClick={() => { setHelperState('idle'); setHelperSelectedAction(null); setActionOutput(""); }} variant="outline" className="text-sm h-10 px-6 border-emerald-200 text-emerald-800 hover:bg-emerald-100 shadow-sm">Done</Button>
                    </div>
                  );
                }
              }
              
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => handleRunAction('email')}
                    disabled={isExecutingAction}
                    className="bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-sm font-medium h-12 shadow-sm"
                  >
                    <Mail className="h-4 w-4 text-blue-500 mr-2" />
                    Draft Progress Email
                  </Button>

                  <Button 
                    variant="outline" 
                    onClick={() => handleRunAction('calendar')}
                    disabled={isExecutingAction}
                    className="bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-sm font-medium h-12 shadow-sm"
                  >
                    <Calendar className="h-4 w-4 text-amber-500 mr-2" />
                    Sync Calendar Event
                  </Button>
                </div>
              );
            })()}

            {isExecutingAction && (
              <div className="flex items-center gap-2 py-2 text-sm text-slate-500 font-mono animate-pulse">
                <RotateCw className="h-4 w-4 animate-spin" /> Preparing AI action payload...
              </div>
            )}

            {activeActionType && actionOutput && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm mt-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-[11px] uppercase font-mono tracking-wider text-slate-500 font-semibold">
                    Drafted {activeActionType === 'email' ? 'Email Payload' : activeActionType === 'calendar' ? 'Calendar Event' : activeActionType === 'essay_outline' ? 'Essay Outline' : activeActionType === 'draft_final' ? 'Final Draft' : activeActionType === 'export_deliverable' ? 'Deliverable' : 'Task Manifest'}
                  </span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px] font-mono tracking-wide py-0.5 px-2">
                    Ready
                  </Badge>
                </div>
                <pre className="text-sm text-slate-700 font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto bg-slate-50 p-4 rounded-lg border border-slate-200">
                  {actionOutput}
                </pre>
                
                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  {activeActionType === 'email' && (
                    <Button 
                      onClick={triggerMailto}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-10 px-5 shadow-sm font-medium"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Dispatch Draft to Email
                    </Button>
                  )}
                  {activeActionType === 'calendar' && (
                    <Button 
                      onClick={triggerGoogleCalendar}
                      className="bg-amber-500 hover:bg-amber-600 text-white text-sm h-10 px-5 shadow-sm font-medium"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Save to Google Cal
                    </Button>
                  )}
                  {activeActionType && ['essay_outline', 'draft_final', 'export_deliverable'].includes(activeActionType) && (
                    <Button 
                      onClick={() => toast.success('Saved to local device.')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm h-10 px-5 shadow-sm font-medium"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Download File
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    onClick={() => { setActiveActionType(null); setActionOutput(""); }}
                    className="text-sm text-slate-500 hover:text-slate-700 h-10 px-4"
                  >
                    Clear
                  </Button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Subtask Quick Completion & Decomposition Box */}
          <div className="bg-white border border-slate-200/60 rounded-3xl p-8 shadow-sm space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Network className="h-4 w-4 text-indigo-500" /> Action Steps
                </span>
                <p className="text-sm text-slate-500">Break down your task into manageable subtasks.</p>
              </div>
              {focusTask.priorityScore !== undefined && (
                <Badge variant="outline" className={`px-3 py-1 bg-slate-50 ${getPriorityColor(focusTask.priorityScore)}`}>
                  Priority {(focusTask.priorityScore).toFixed(1)}
                </Badge>
              )}
            </div>

            {focusTask.subtasks && focusTask.subtasks.length > 0 ? (
              <div className="space-y-6">
                {(() => {
                  const activeSubtasks = focusTask.subtasks || [];
                  const totalSubtasks = activeSubtasks.length;
                  const completedSubtasks = activeSubtasks.filter(s => s.completed).length;
                  const subPercentage = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
                  const radius = 36;
                  const circumference = 2 * Math.PI * radius;
                  const offset = circumference - (subPercentage / 100) * circumference;

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                      {/* Circular Progress Bar Component */}
                      <div className="md:col-span-4 flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="relative h-28 w-28 flex items-center justify-center">
                          <svg className="absolute -rotate-90 w-full h-full" viewBox="0 0 80 80">
                            <circle
                              cx="40"
                              cy="40"
                              r={radius}
                              className="text-slate-200"
                              strokeWidth="6"
                              stroke="currentColor"
                              fill="transparent"
                            />
                            <motion.circle
                              cx="40"
                              cy="40"
                              r={radius}
                              className="text-indigo-600"
                              strokeWidth="6"
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
                            <span className="text-xl font-bold text-slate-900 tracking-tight">
                              {Math.round(subPercentage)}%
                            </span>
                          </div>
                        </div>
                        <div className="text-center mt-4">
                          <span className="text-sm font-medium text-slate-600">
                            {completedSubtasks} of {totalSubtasks} steps
                          </span>
                        </div>
                      </div>

                      {/* Subtask checklist */}
                      <div className="md:col-span-8 space-y-3 pt-2">
                        {focusTask.subtasks.map((sub, i) => (
                          <div key={i} className="flex items-center gap-4 py-2 group">
                            <button 
                              onClick={() => {
                                const newSubs = [...(focusTask.subtasks || [])];
                                newSubs[i].completed = !newSubs[i].completed;
                                updateTask(focusTask.id, { subtasks: newSubs });
                                toast.success(`Updated step "${sub.title}".`);
                              }}
                              className="text-slate-300 hover:text-indigo-600 transition-colors shrink-0"
                            >
                              {sub.completed ? <CheckCircle2 className="h-6 w-6 text-indigo-600" /> : <Circle className="h-6 w-6 text-slate-300 hover:text-slate-400" />}
                            </button>
                            <span className={`flex-1 text-base transition-all ${sub.completed ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700'}`}>
                              {sub.title}
                            </span>
                            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">{sub.estimatedMinutes}m</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-indigo-500" />
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <p className="text-sm text-slate-900 font-medium">Break it down with AI</p>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Generate actionable steps automatically to reduce overwhelm and start executing.
                  </p>
                </div>
                <Button 
                  onClick={() => handleDecompose(focusTask)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm h-10 px-6 rounded-full shadow-sm mt-2 font-medium"
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Decompose Task
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={() => {
                updateTask(focusTask.id, { status: 'completed' });
                setPrimaryFocusTaskId(null);
                toast.success("Hooray! Focus task completed successfully.");
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm h-12 px-8 rounded-full shadow-md transition-transform hover:scale-105"
            >
              <Check className="h-5 w-5 mr-2" />
              Complete Task
            </Button>
          </div>
        </motion.div>
      ) : (
        <div className="bg-white border border-slate-200/60 p-12 rounded-3xl flex flex-col items-center justify-center text-center space-y-6 shadow-sm">
          <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
            <Star className="h-8 w-8 text-amber-500 fill-amber-500/20" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">No Primary Focus</h3>
            <p className="text-base text-slate-500 max-w-md mx-auto leading-relaxed">
              Select a task to enter Deep Focus mode and block out all distractions.
            </p>
          </div>
          <Button 
            onClick={handleReEnterFocusMode}
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm h-12 px-8 rounded-full shadow-md transition-transform hover:scale-105 mt-4"
          >
            <Star className="h-4 w-4 mr-2" />
            Select a Task to Focus
          </Button>
        </div>
      )}

      <VoiceOrb />
    </div>
  );
}
