import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Task, UserPreferences, TaskPlan, TaskPlanItem } from '../types';

interface AppState {
  user: any | null;
  preferences: UserPreferences | null;
  tasks: Task[];
  insights: string[];
  isVoiceListening: boolean;
  geminiApiKey: string | null;
  primaryFocusTaskId: string | null;
  emergencyMode: boolean;
  proposedPlan: TaskPlan | null;
  approvedPlan: TaskPlan | null;
  planStatus: 'idle' | 'generating' | 'proposed' | 'approved' | 'executing';
  setUser: (user: any | null) => void;
  setPreferences: (prefs: UserPreferences) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  setTasks: (tasks: Task[]) => void;
  setInsights: (insights: string[]) => void;
  setVoiceListening: (isListening: boolean) => void;
  setGeminiApiKey: (key: string | null) => void;
  setPrimaryFocusTaskId: (id: string | null) => void;
  setEmergencyMode: (active: boolean) => void;
  triggerAutoAIPlan: () => Promise<void>;
  autoEvaluatePrioritiesAndFocus: () => void;
  setProposedPlan: (plan: TaskPlan | null) => void;
  setApprovedPlan: (plan: TaskPlan | null) => void;
  setPlanStatus: (status: 'idle' | 'generating' | 'proposed' | 'approved' | 'executing') => void;
  generateProposedPlan: () => Promise<void>;
  approvePlan: () => void;
  updatePlanItemStatus: (itemId: string, status: 'pending' | 'completed' | 'in-progress' | 'skipped') => void;
  addPlanExecutionLog: (log: string) => void;
  syncToCalendar: () => Promise<void>;
  sendProgressEmail: (toEmail: string) => Promise<void>;
}

import { getAccessToken } from '../lib/firebase';

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      preferences: null,
      tasks: [],
      insights: [],
      isVoiceListening: false,
      geminiApiKey: null,
      primaryFocusTaskId: null,
      emergencyMode: false,
      proposedPlan: null,
      approvedPlan: null,
      planStatus: 'idle',
      setUser: (user) => set({ user }),
      setPreferences: (preferences) => set({ preferences }),
      addTask: (task) => {
        set((state) => ({ tasks: [...state.tasks, task] }));
        get().autoEvaluatePrioritiesAndFocus();
        get().triggerAutoAIPlan();
      },
      updateTask: (taskId, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
        }));
        get().autoEvaluatePrioritiesAndFocus();
        // Trigger auto AI planning if the updates include changing status/title/deadline
        const coreKeys = ['title', 'status', 'deadline', 'description'];
        const hasCoreChange = Object.keys(updates).some(key => coreKeys.includes(key));
        if (hasCoreChange) {
          get().triggerAutoAIPlan();
        }
      },
      deleteTask: (taskId) => {
        set((state) => ({ 
          tasks: state.tasks.filter((t) => t.id !== taskId),
          primaryFocusTaskId: state.primaryFocusTaskId === taskId ? null : state.primaryFocusTaskId
        }));
        get().autoEvaluatePrioritiesAndFocus();
        get().triggerAutoAIPlan();
      },
      setTasks: (tasks) => {
        set({ tasks });
        get().autoEvaluatePrioritiesAndFocus();
      },
      setInsights: (insights) => set({ insights }),
      setVoiceListening: (isVoiceListening) => set({ isVoiceListening }),
      setGeminiApiKey: (geminiApiKey) => set({ geminiApiKey }),
      setPrimaryFocusTaskId: (primaryFocusTaskId) => set({ primaryFocusTaskId }),
      setEmergencyMode: (emergencyMode) => set({ emergencyMode }),
      autoEvaluatePrioritiesAndFocus: () => {
        const currentTasks = get().tasks;
        const pending = currentTasks.filter(t => t.status !== 'completed');
        if (pending.length === 0) {
          set({ primaryFocusTaskId: null });
          return;
        }

        // 1. Identify the task with the smallest (earliest) deadline
        const sortedByDeadline = [...pending].sort((a, b) => {
          const ad = new Date(a.deadline).getTime();
          const bd = new Date(b.deadline).getTime();
          return ad - bd;
        });

        const smallestDeadlineTask = sortedByDeadline[0];

        // 2. Assign highest priority to the task with the smaller deadline.
        // Index 0 gets highest score (10.0), and others get lower scores dynamically.
        // This ensures every pending task has a priority score assigned and the smallest deadline task always wins.
        const updatedTasks = currentTasks.map(t => {
          if (t.status === 'completed') return t;
          const idx = sortedByDeadline.findIndex(st => st.id === t.id);
          if (idx !== -1) {
            const score = Math.max(1.0, 10.0 - idx * 1.5);
            return {
              ...t,
              priorityScore: score,
              urgency: Math.max(1, Math.round(10 - idx * 1.5)),
              impact: Math.max(1, Math.round(9 - idx * 1.0)),
              effort: t.effort || 3,
            };
          }
          return t;
        });

        set({
          tasks: updatedTasks,
          primaryFocusTaskId: smallestDeadlineTask.id
        });
      },
      triggerAutoAIPlan: async () => {
        const currentTasks = get().tasks;
        const geminiApiKey = get().geminiApiKey;
        const pending = currentTasks.filter(t => t.status !== 'completed');
        if (pending.length === 0) return;

        try {
          const res = await fetch('/api/agents/reprioritize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(geminiApiKey ? { 'x-gemini-api-key': geminiApiKey } : {})
            },
            body: JSON.stringify({ tasks: currentTasks })
          });
          if (!res.ok) {
            console.warn("Auto AI Prioritization error status:", res.status);
            return;
          }
          const data = await res.json();
          if (data.tasks && Array.isArray(data.tasks)) {
            const updated = get().tasks.map(t => {
              const aiUpdate = data.tasks.find((at: any) => at.id === t.id);
              if (aiUpdate) {
                return {
                  ...t,
                  priorityScore: aiUpdate.priorityScore,
                  urgency: aiUpdate.urgency,
                  impact: aiUpdate.impact,
                  effort: aiUpdate.effort,
                  subtasks: t.subtasks && t.subtasks.length > 0 ? t.subtasks : aiUpdate.subtasks || t.subtasks
                };
              }
              return t;
            });
            // Perform silent state update to avoid loops
            set({ tasks: updated });
            
            // Automatically select the highest priority pending task as primary focus
            const updatedPending = updated.filter(t => t.status !== 'completed');
            if (updatedPending.length > 0) {
              updatedPending.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
              set({ primaryFocusTaskId: updatedPending[0].id });
            }
            
            if (data.globalPlanInsight) {
              const currentInsights = get().insights || [];
              const alreadyExists = currentInsights.includes(data.globalPlanInsight);
              if (!alreadyExists) {
                set({ insights: [data.globalPlanInsight, ...currentInsights.slice(0, 4)] });
              }
            }
          }
        } catch (err) {
          console.warn("Auto AI Prioritization fetch failed:", err);
        }
      },
      setProposedPlan: (proposedPlan) => set({ proposedPlan }),
      setApprovedPlan: (approvedPlan) => set({ approvedPlan }),
      setPlanStatus: (planStatus) => set({ planStatus }),
      generateProposedPlan: async () => {
        set({ planStatus: 'generating' });
        const currentTasks = get().tasks;
        const geminiApiKey = get().geminiApiKey;
        try {
          const res = await fetch('/api/agents/generate-plan', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(geminiApiKey ? { 'x-gemini-api-key': geminiApiKey } : {})
            },
            body: JSON.stringify({ tasks: currentTasks })
          });
          if (!res.ok) {
            throw new Error("Failed to generate plan");
          }
          const data = await res.json();
          if (data && data.items) {
            set({ proposedPlan: data, planStatus: 'proposed' });
          } else {
            throw new Error("Invalid plan data received");
          }
        } catch (err) {
          console.error("Plan generation failed:", err);
          set({ planStatus: 'idle' });
        }
      },
      approvePlan: () => {
        const proposed = get().proposedPlan;
        if (!proposed) return;
        const approved: TaskPlan = {
          ...proposed,
          status: 'approved',
          createdAt: new Date().toISOString(),
          executionLogs: [
            `[${new Date().toLocaleTimeString()}] Plan approved by user. Following active timeline.`,
            `[${new Date().toLocaleTimeString()}] Execution Agent initialized and patrolling milestones.`,
            `[${new Date().toLocaleTimeString()}] Task priorities adjusted to align with active focus sequence.`
          ]
        };
        
        // Let's also update tasks priority scores and active focus according to the approved plan
        const firstItem = approved.items[0];
        const updatedTasks = get().tasks.map(t => {
          const planItem = approved.items.find(item => item.taskId === t.id);
          if (planItem) {
            // Adjust priority score to match plan sequence
            const idx = approved.items.findIndex(item => item.taskId === t.id);
            const score = Math.max(1.0, 10.0 - idx * 1.5);
            return {
              ...t,
              priorityScore: score,
              urgency: Math.max(1, Math.round(10 - idx * 1.5)),
            };
          }
          return t;
        });

        set({
          tasks: updatedTasks,
          approvedPlan: approved,
          proposedPlan: null,
          planStatus: 'executing',
          primaryFocusTaskId: firstItem ? firstItem.taskId : get().primaryFocusTaskId
        });
      },
      updatePlanItemStatus: (itemId, status) => {
        const approved = get().approvedPlan;
        if (!approved) return;
        const updatedItems = approved.items.map(item => {
          if (item.id === itemId) {
            return { ...item, status };
          }
          return item;
        });

        const activeItem = updatedItems.find(item => item.id === itemId);
        const logMsg = `[${new Date().toLocaleTimeString()}] Execution Agent: "${activeItem?.description || activeItem?.taskTitle || itemId}" marked as ${status}.`;

        const isAllCompleted = updatedItems.every(i => i.status === 'completed' || i.status === 'skipped');

        set({
          approvedPlan: {
            ...approved,
            items: updatedItems,
            status: isAllCompleted ? 'completed' : approved.status,
            executionLogs: [...approved.executionLogs, logMsg]
          }
        });

        // If we completed a subtask, let's update it in tasks too!
        if (activeItem && status === 'completed') {
          const task = get().tasks.find(t => t.id === activeItem.taskId);
          if (task) {
            if (activeItem.subtaskId && task.subtasks) {
              const updatedSubs = task.subtasks.map(sub => {
                if (sub.id === activeItem.subtaskId) {
                  return { ...sub, completed: true };
                }
                return sub;
              });
              get().updateTask(task.id, { subtasks: updatedSubs });
            } else {
              get().updateTask(task.id, { status: 'completed' });
            }
          }
        }
      },
      addPlanExecutionLog: (log) => {
        const approved = get().approvedPlan;
        if (!approved) return;
        set({
          approvedPlan: {
            ...approved,
            executionLogs: [...approved.executionLogs, `[${new Date().toLocaleTimeString()}] ${log}`]
          }
        });
      },
      syncToCalendar: async () => {
        const approved = get().approvedPlan;
        if (!approved) return;
        
        const token = await getAccessToken();
        if (!token) {
          console.error("No access token for Calendar sync");
          get().addPlanExecutionLog("Failed to sync to Calendar: No access token available.");
          return;
        }

        get().addPlanExecutionLog("Starting Google Calendar sync...");
        
        try {
          for (const item of approved.items) {
            // Very basic parser for "09:00 AM" format - assume date is something like "YYYY-MM-DD" or similar
            // If the format is generic, we just put it as a description for now, and try to make an educated guess of the time.
            let startDateTime = new Date();
            let endDateTime = new Date(startDateTime.getTime() + item.durationMinutes * 60000);
            
            // Just use a generic event for now to avoid date parsing complexities if timeSlot is unparseable
            const event = {
              summary: `[NEXUS] ${item.taskTitle}`,
              description: `Focus Block for ${item.taskTitle}\nSubtask: ${item.subtaskTitle || 'None'}\n\nNotes: ${item.description}`,
              start: {
                dateTime: startDateTime.toISOString(),
              },
              end: {
                dateTime: endDateTime.toISOString(),
              }
            };

            await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(event)
            });
          }
          get().addPlanExecutionLog("Successfully synced focus blocks to Google Calendar.");
        } catch (error) {
          console.error("Calendar sync error", error);
          get().addPlanExecutionLog("Calendar sync failed. Check console for details.");
        }
      },
      sendProgressEmail: async (toEmail: string) => {
        const approved = get().approvedPlan;
        const currentTasks = get().tasks;
        if (!approved) return;
        
        const token = await getAccessToken();
        if (!token) {
          console.error("No access token for Gmail");
          get().addPlanExecutionLog("Failed to send email: No access token available.");
          return;
        }

        get().addPlanExecutionLog(`Drafting progress report to ${toEmail}...`);
        
        try {
          const completedCount = approved.items.filter(i => i.status === 'completed').length;
          const totalCount = approved.items.length;
          
          const emailLines = [
            `To: ${toEmail}`,
            `Subject: NEXUS Progress Report - ${new Date().toLocaleDateString()}`,
            `Content-Type: text/html; charset=utf-8`,
            '',
            `<h2>NEXUS Autonomous Focus Report</h2>`,
            `<p><strong>Objective:</strong> ${approved.objective}</p>`,
            `<p><strong>Progress:</strong> ${completedCount} / ${totalCount} focus blocks completed.</p>`,
            `<h3>Timeline details:</h3>`,
            `<ul>`,
            ...approved.items.map(i => `<li>[${i.status.toUpperCase()}] <b>${i.taskTitle}</b>: ${i.description}</li>`),
            `</ul>`,
            `<p><em>Automated update via NEXUS Execution Agent</em></p>`
          ];
          
          const emailMessage = emailLines.join('\r\n');
          const encodedMessage = btoa(emailMessage).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          
          await fetch('https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              raw: encodedMessage
            })
          });
          
          get().addPlanExecutionLog(`Successfully sent progress report to ${toEmail}.`);
        } catch (error) {
          console.error("Gmail send error", error);
          get().addPlanExecutionLog("Failed to send progress report via Gmail.");
        }
      }
    }),
    {
      name: 'nexus-storage',
    }
  )
);
