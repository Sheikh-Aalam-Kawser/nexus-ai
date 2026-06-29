import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
const PORT = 3000;

// Helper to get Gemini AI Client dynamically (allows client-supplied API key or OAuth access token)
function getAIClient(req: express.Request): any {
  const customKey = req.headers['x-gemini-api-key'];
  const key = (typeof customKey === 'string' && customKey.trim()) ? customKey.trim() : process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("No Gemini API key found. Please configure the GEMINI_API_KEY in the workspace Settings, or enter your personal key in the dashboard API Key panel.");
  }

  const trimmedKey = key.trim();

  // If it's an OAuth Bearer token (starts with AQ. or ya29.)
  if (trimmedKey.startsWith('AQ.') || trimmedKey.startsWith('ya29.')) {
    return {
      models: {
        generateContent: async ({ model, contents, config }: any) => {
          let contentsPayload: any[];
          if (typeof contents === 'string') {
            contentsPayload = [{ role: 'user', parts: [{ text: contents }] }];
          } else if (Array.isArray(contents)) {
            contentsPayload = contents.map(item => {
              if (typeof item === 'string') {
                return { role: 'user', parts: [{ text: item }] };
              }
              return item;
            });
          } else {
            contentsPayload = [{ role: 'user', parts: [{ text: String(contents) }] }];
          }

          const payload: any = {
            contents: contentsPayload
          };

          if (config) {
            payload.generationConfig = {};
            if (config.responseMimeType) {
              payload.generationConfig.responseMimeType = config.responseMimeType;
            }
            if (config.responseSchema) {
              payload.generationConfig.responseSchema = config.responseSchema;
            }
            if (config.systemInstruction) {
              payload.systemInstruction = {
                parts: [{ text: config.systemInstruction }]
              };
            }
          }

          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${trimmedKey}`,
              'User-Agent': 'aistudio-build'
            },
            body: JSON.stringify(payload)
          });

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Gemini REST API error (${res.status}): ${errText}`);
          }

          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          return { text };
        }
      }
    };
  }

  return new GoogleGenAI({ 
    apiKey: trimmedKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });
}

// ---------------------------------------------------------------------------
// 1. Orchestrator + Decomposer Agent (Task Breakdown)
// ---------------------------------------------------------------------------
app.post("/api/agents/decompose", async (req, res) => {
  const { title, description, deadline, preferences } = req.body;
  
  try {
    const aiInstance = getAIClient(req);
    const prompt = `Perform a cooperative multi-agent analysis and decomposition on the task below:
Task details:
- Title: ${title}
- Description: ${description || 'No description provided.'}
- Deadline: ${deadline || 'No deadline provided.'}
- User Context/Preferences: ${JSON.stringify(preferences || {})}

Collaborative sequence to execute:
1. "Perceiving agent": Gathers the raw input details, constraints, deadlines, and environmental state to establish baseline context.
2. "Prioritizing agent": Refines metrics for urgency, impact, effort, and provides a priority rating based on the perceived state.
3. "Decomposing Agent": Breaks down the complex target into a logical sequence of 3 to 7 actionable, time-boxed subtasks.
4. "Planning agent": Recommends execution timeframes, optimal peak productivity hours, and pacing strategies.
5. "Autonomous task automation agent": Defines automated triggers, drafts system action templates, or sets context alarms.
6. "Orchestrating agent": Coordinates the sequence, performs final quality assurance, and validates that all deliverables are cohesive.`;

    const response = await aiInstance.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are the NEXUS Multi-Agent Orchestrator. You coordinate a multi-agent system comprising: 'Perceiving agent', 'Prioritizing agent', 'Decomposing Agent', 'Planning agent', 'Autonomous task automation agent', and 'Orchestrating agent'. Each agent must perform its specific role sequentially to analyze, prioritize, decompose, plan, and draft automations for the task. You must return the final output strictly adhering to the JSON schema, with detailed collaborative logs for each agent.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subtasks: {
              type: Type.ARRAY,
              description: "Actionable steps generated by the Decomposing Agent",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "Unique short subtask identifier, e.g. 'sub-1', 'sub-2'" },
                  title: { type: Type.STRING, description: "The subtask title" },
                  estimatedMinutes: { type: Type.NUMBER, description: "Estimated focus time in minutes" },
                  completed: { type: Type.BOOLEAN, description: "Initialize to false" }
                },
                required: ["id", "title", "estimatedMinutes", "completed"]
              }
            },
            urgency: { type: Type.NUMBER, description: "Urgency score from 1 to 10 computed by 'Prioritizing agent'" },
            impact: { type: Type.NUMBER, description: "Impact score from 1 to 10 computed by 'Prioritizing agent'" },
            effort: { type: Type.NUMBER, description: "Effort score from 1 to 10 computed by 'Prioritizing agent'" },
            agentLogs: {
              type: Type.OBJECT,
              properties: {
                perceivingAgentLog: { type: Type.STRING, description: "Environmental context and constraints perception analysis." },
                prioritizingAgentLog: { type: Type.STRING, description: "Urgency, impact, effort prioritizer reasoning." },
                decomposingAgentLog: { type: Type.STRING, description: "Decomposing agent details on how subtasks are structured." },
                planningAgentLog: { type: Type.STRING, description: "Schedule recommendations, focus block hours suggested." },
                autonomousAutomationLog: { type: Type.STRING, description: "Self-directed background triggers, alarms, or email draft recommendations." },
                orchestratingAgentLog: { type: Type.STRING, description: "System orchestration quality assurance and pipeline validation summary." }
              },
              required: [
                "perceivingAgentLog",
                "prioritizingAgentLog",
                "decomposingAgentLog",
                "planningAgentLog",
                "autonomousAutomationLog",
                "orchestratingAgentLog"
              ]
            }
          },
          required: ["subtasks", "urgency", "impact", "effort", "agentLogs"]
        }
      }
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error("Decomposer error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 2. Scheduler Agent (Focus Blocks)
// ---------------------------------------------------------------------------
app.post("/api/agents/schedule", async (req, res) => {
  const { task, subtasks, preferences, existingEvents } = req.body;
  
  try {
    const aiInstance = getAIClient(req);
    const prompt = `Propose Focus Blocks (calendar slots) to complete these subtasks before the deadline.
Deadline: ${task.deadline}
Subtasks: ${JSON.stringify(subtasks)}
User Preferences (Peak hours, DND): ${JSON.stringify(preferences)}
Existing Events: ${JSON.stringify(existingEvents || [])}`;

    const response = await aiInstance.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are the NEXUS Scheduler Agent. Propose calendar blocks avoiding existing events and respecting user preferences. Output JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              subtaskId: { type: Type.STRING, description: "Match the subtask index/title if id missing" },
              start: { type: Type.STRING, description: "ISO 8601 string" },
              end: { type: Type.STRING, description: "ISO 8601 string" }
            },
            required: ["start", "end"]
          }
        }
      }
    });

    res.json(JSON.parse(response.text || '[]'));
  } catch (error: any) {
    console.error("Scheduler error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 3. Voice Parsing (NEXUS Voice Agent)
// ---------------------------------------------------------------------------
app.post("/api/agents/voice", async (req, res) => {
  const { transcript } = req.body;
  
  try {
    const aiInstance = getAIClient(req);
    const response = await aiInstance.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Parse this voice command into a task: "${transcript}"\nCurrent Time: ${new Date().toISOString()}`,
      config: {
        systemInstruction: "You extract task name, deadline, and priority from natural language voice commands. Output JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            deadline: { type: Type.STRING, description: "ISO 8601 date, inferred if possible" },
            priorityScore: { type: Type.NUMBER }
          }
        }
      }
    });
    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error("Voice parsing error:", error);
    res.status(500).json({ error: error.message });
  }
});


// ---------------------------------------------------------------------------
// 4. Nudge Agent (Context-Aware Notifications)
// ---------------------------------------------------------------------------
app.post("/api/agents/nudge", async (req, res) => {
  const { task, userState } = req.body;
  try {
    const aiInstance = getAIClient(req);
    const response = await aiInstance.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Task: ${JSON.stringify(task)}\nUser State: ${JSON.stringify(userState)}`,
      config: {
        systemInstruction: "You are the NEXUS Nudge Agent. Generate a context-aware nudge message (max 2 sentences) and a suggested micro-action.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING },
            suggestedAction: { type: Type.STRING }
          }
        }
      }
    });
    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 5. Execution Agent (Calendar/Email Automations)
// ---------------------------------------------------------------------------
app.post("/api/agents/execute", async (req, res) => {
  const { actionType, details } = req.body;
  try {
    const aiInstance = getAIClient(req);
    const response = await aiInstance.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Action: ${actionType}\nDetails: ${JSON.stringify(details)}`,
      config: {
        systemInstruction: "You are the NEXUS Execution Agent. Draft an email or calendar event description based on the request.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
            generatedContent: { type: Type.STRING }
          }
        }
      }
    });
    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 6. Reflection Agent (Insights & Analytics)
// ---------------------------------------------------------------------------
app.post("/api/agents/reflect", async (req, res) => {
  const { completedTasks } = req.body;
  try {
    const aiInstance = getAIClient(req);
    const response = await aiInstance.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Completed Tasks: ${JSON.stringify(completedTasks)}`,
      config: {
        systemInstruction: "You are the NEXUS Reflection Agent. Analyze the completed tasks and provide 3 actionable insights on the user's productivity patterns.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });
    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 7. Auto-Orchestrator (Global Re-Prioritization & Planning)
// ---------------------------------------------------------------------------
app.post("/api/agents/reprioritize", async (req, res) => {
  const { tasks } = req.body;
  if (!tasks || !Array.isArray(tasks)) {
    return res.status(400).json({ error: "Invalid tasks array provided." });
  }

  try {
    const aiInstance = getAIClient(req);
    const response = await aiInstance.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Current tasks: ${JSON.stringify(tasks)}\nCurrent Time: ${new Date().toISOString()}`,
      config: {
        systemInstruction: "You are the NEXUS Orchestrator Agent. You analyze the list of tasks. For each task, calculate/re-evaluate its priority score (1.0 to 10.0 scale, where 10 is highest), urgency, impact, and effort. If a task has no subtasks (is empty or length is 0) and is pending/in-progress, generate 3 to 5 clear, sequential, and highly actionable subtasks (each with a unique id, title, estimatedMinutes, and completed: false). Provide a short overall focus plan under globalPlanInsight.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  priorityScore: { type: Type.NUMBER },
                  urgency: { type: Type.NUMBER },
                  impact: { type: Type.NUMBER },
                  effort: { type: Type.NUMBER },
                  subtasks: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        estimatedMinutes: { type: Type.NUMBER },
                        completed: { type: Type.BOOLEAN }
                      }
                    }
                  }
                },
                required: ["id", "priorityScore", "urgency", "impact", "effort"]
              }
            },
            globalPlanInsight: { type: Type.STRING }
          },
          required: ["tasks", "globalPlanInsight"]
        }
      }
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error("Reprioritization API error:", error);
    const msg = error.message || String(error);
    const isPermissionError = msg.includes("denied access") || msg.includes("403") || msg.includes("PERMISSION_DENIED");
    res.status(isPermissionError ? 403 : 500).json({ 
      error: isPermissionError ? "PERMISSION_DENIED" : "API_ERROR", 
      message: error.message || "Failed to reprioritize tasks." 
    });
  }
});

// ---------------------------------------------------------------------------
// 8. Planning Agent (Generate Realistic Task Execution Plan)
// ---------------------------------------------------------------------------
app.post("/api/agents/generate-plan", async (req, res) => {
  const { tasks } = req.body;
  if (!tasks || !Array.isArray(tasks)) {
    return res.status(400).json({ error: "Invalid tasks array provided." });
  }

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  if (pendingTasks.length === 0) {
    return res.json({
      id: "plan-" + Math.random().toString(36).substring(2, 11),
      objective: "No active tasks found. Clear horizon!",
      items: [],
      createdAt: new Date().toISOString(),
      status: "completed",
      executionLogs: []
    });
  }

  try {
    const aiInstance = getAIClient(req);
    const response = await aiInstance.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Generate a realistic, structured, chronologically sequenced execution plan to complete all pending tasks before their deadlines.
Current tasks: ${JSON.stringify(pendingTasks)}
Current Time: ${new Date().toISOString()}`,
      config: {
        systemInstruction: "You are the NEXUS Lead Planning Agent. You examine the tasks, their deadlines, priority scores, and subtasks. You must generate a highly structured sequential list of specific, time-boxed schedule items (plan items) that allows the user to complete all tasks and subtasks efficiently. Ensure earlier deadlines and higher priority tasks are scheduled first. Each scheduled item must map to a task (and optionally a specific subtask) with a logical duration, relative date, time slot, and description. Output JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            objective: { type: Type.STRING, description: "A high-level sentence stating the core objective of this schedule." },
            items: {
              type: Type.ARRAY,
              description: "Chronologically sorted task plan items",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  taskId: { type: Type.STRING },
                  taskTitle: { type: Type.STRING },
                  subtaskId: { type: Type.STRING, description: "Optional subtask ID if mapping to a subtask" },
                  subtaskTitle: { type: Type.STRING, description: "Optional subtask title" },
                  timeSlot: { type: Type.STRING, description: "Formatted time range, e.g. '09:00 - 10:30' or '14:00 - 15:15'" },
                  durationMinutes: { type: Type.NUMBER, description: "Minutes allotted for this session" },
                  date: { type: Type.STRING, description: "Target date in format YYYY-MM-DD or relative day" },
                  description: { type: Type.STRING, description: "Specific actionable objective of this focus block" },
                  status: { type: Type.STRING, description: "Must be 'pending'" }
                },
                required: ["id", "taskId", "taskTitle", "timeSlot", "durationMinutes", "date", "description", "status"]
              }
            }
          },
          required: ["id", "objective", "items"]
        }
      }
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error("Plan generation API error:", error);
    res.status(500).json({ error: error.message || "Failed to generate plan." });
  }
});

// ---------------------------------------------------------------------------
// Vite Middleware
// ---------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
