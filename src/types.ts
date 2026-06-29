import { z } from 'zod';

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'overdue';

export const TaskSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  description: z.string(),
  deadline: z.string(), // ISO string
  status: z.enum(['pending', 'in-progress', 'completed', 'overdue']),
  priorityScore: z.number().optional(),
  urgency: z.number().optional(),
  impact: z.number().optional(),
  effort: z.number().optional(),
  dependency: z.number().optional(),
  subtasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    estimatedMinutes: z.number(),
    completed: z.boolean(),
  })).optional(),
  focusBlocks: z.array(z.object({
    calendarEventId: z.string().optional(),
    start: z.string(),
    end: z.string(),
    subtaskId: z.string().optional(),
  })).optional(),
  agentLogs: z.object({
    perceivingAgentLog: z.string().optional(),
    prioritizingAgentLog: z.string().optional(),
    decomposingAgentLog: z.string().optional(),
    planningAgentLog: z.string().optional(),
    autonomousAutomationLog: z.string().optional(),
    orchestratingAgentLog: z.string().optional(),
  }).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Task = z.infer<typeof TaskSchema>;

export interface TaskPlanItem {
  id: string;
  taskId: string;
  taskTitle: string;
  subtaskId?: string;
  subtaskTitle?: string;
  timeSlot: string;
  durationMinutes: number;
  date: string;
  description: string;
  status: 'pending' | 'completed' | 'in-progress' | 'skipped';
}

export interface TaskPlan {
  id: string;
  items: TaskPlanItem[];
  objective: string;
  createdAt: string;
  status: 'draft' | 'approved' | 'completed' | 'failed';
  executionLogs: string[];
}

export type UserPreferences = {
  peakHoursStart: string;
  peakHoursEnd: string;
  doNotDisturbStart: string;
  doNotDisturbEnd: string;
  nudgeTone: 'professional' | 'casual' | 'motivational';
  userType: 'student' | 'professional' | 'entrepreneur' | 'freelancer';
};
