import { z } from "zod";

const prioritySchema = z.enum(["high", "medium", "low"]);
const privacyLevelSchema = z.enum(["normal", "sensitive", "vault"]);
const recurrenceRuleSchema = z.enum(["daily", "weekdays", "weekly", "monthly"]);

const optionalText = z.string().trim().optional();
const requiredText = z.string().trim().min(1).max(200);
const longText = z.string().trim().max(4000);
const optionalUrl = z.union([z.string().trim().url().max(500), z.literal("")]).optional();

export const myOSActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("addProject"),
    payload: z.object({
      name: requiredText,
      category: requiredText,
      nextAction: requiredText,
      goalId: optionalText
    })
  }),
  z.object({
    type: z.literal("updateProject"),
    payload: z.object({
      id: requiredText,
      name: requiredText,
      category: requiredText,
      nextAction: requiredText,
      status: z.enum(["planned", "active", "paused", "done", "archived"]),
      favorite: z.boolean(),
      goalId: optionalText
    })
  }),
  z.object({
    type: z.literal("deleteProject"),
    payload: z.object({ id: requiredText })
  }),
  z.object({
    type: z.literal("updateProjectAgentProfile"),
    payload: z.object({
      projectId: requiredText,
      summary: longText,
      techStack: z.array(z.string().trim().min(1).max(80)).max(20),
      progressMode: z.enum(["manual", "agent_work"]),
      manualProgress: z.number().min(0).max(100),
      preferredAgent: z.enum(["codex", "claude-code", "opencode", "copilot", "hermes", "openclaw"]).optional(),
      fallbackAgent: z.enum(["codex", "claude-code", "opencode", "copilot", "hermes", "openclaw"]).optional(),
      permissionProfile: z.enum(["safe", "standard", "advanced"]).optional(),
      maxRuntimeMinutes: z.number().min(1).max(240).optional(),
      autoRetry: z.number().min(0).max(3).optional(),
      verification: z.object({
        typecheck: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
        lint: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
        test: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
        build: z.array(z.string().trim().min(1).max(80)).max(8).optional()
      }).optional()
    })
  }),
  z.object({
    type: z.literal("addProjectMilestone"),
    payload: z.object({
      projectId: requiredText,
      title: requiredText,
      description: longText,
      status: z.enum(["planned", "in_progress", "completed", "blocked"]),
      targetDate: optionalText,
      progress: z.number().min(0).max(100)
    })
  }),
  z.object({
    type: z.literal("updateProjectMilestone"),
    payload: z.object({
      id: requiredText,
      title: requiredText,
      description: longText,
      status: z.enum(["planned", "in_progress", "completed", "blocked"]),
      targetDate: optionalText,
      progress: z.number().min(0).max(100)
    })
  }),
  z.object({
    type: z.literal("deleteProjectMilestone"),
    payload: z.object({ id: requiredText })
  }),
  z.object({
    type: z.literal("addProjectRisk"),
    payload: z.object({
      projectId: requiredText,
      title: requiredText,
      severity: z.enum(["low", "medium", "high"]),
      status: z.enum(["open", "mitigated", "accepted"]),
      mitigation: longText
    })
  }),
  z.object({
    type: z.literal("updateProjectRisk"),
    payload: z.object({
      id: requiredText,
      title: requiredText,
      severity: z.enum(["low", "medium", "high"]),
      status: z.enum(["open", "mitigated", "accepted"]),
      mitigation: longText
    })
  }),
  z.object({
    type: z.literal("deleteProjectRisk"),
    payload: z.object({ id: requiredText })
  }),
  z.object({
    type: z.literal("assignProjectAgent"),
    payload: z.object({
      projectId: requiredText,
      agentId: z.enum(["codex", "claude-code", "opencode", "copilot", "hermes", "openclaw"]),
      role: requiredText
    })
  }),
  z.object({
    type: z.literal("addAgentWorkItem"),
    payload: z.object({
      projectId: requiredText,
      agentId: z.enum(["codex", "claude-code", "opencode", "copilot", "hermes", "openclaw"]),
      title: requiredText,
      instructions: longText
    })
  }),
  z.object({
    type: z.literal("updateAgentWorkItem"),
    payload: z.object({
      id: requiredText,
      status: z.enum(["queued", "in_progress", "blocked", "completed"]),
      progress: z.number().min(0).max(100),
      blockedReason: longText.optional(),
      result: longText.optional(),
      changedFiles: z.array(z.string().trim().min(1).max(500)).max(100).optional(),
      testResult: longText.optional(),
      artifactUrl: optionalUrl,
      eventMessage: longText.optional()
    })
  }),
  z.object({
    type: z.literal("addAgentReport"),
    payload: z.object({
      projectId: requiredText,
      workItemId: optionalText,
      agentId: z.enum(["codex", "claude-code", "opencode", "copilot", "hermes", "openclaw"]),
      summary: longText.min(1),
      progress: z.number().min(0).max(100),
      status: z.enum(["queued", "in_progress", "blocked", "completed"]).optional(),
      blockedReason: longText.optional(),
      changedFiles: z.array(z.string().trim().min(1).max(500)).max(100).optional(),
      testResult: longText.optional(),
      artifactUrl: optionalUrl
    })
  }),
  z.object({
    type: z.literal("upsertAgentExecution"),
    payload: z.object({
      id: requiredText,
      workItemId: requiredText,
      projectId: requiredText,
      projectName: requiredText,
      agentId: z.enum(["codex", "claude-code", "opencode", "copilot", "hermes", "openclaw"]),
      title: requiredText,
      instructions: longText,
      workingDirectory: z.string().trim().max(1000),
      permissionProfile: z.enum(["safe", "standard", "advanced"]),
      status: z.enum(["queued", "preparing", "running", "waiting_for_approval", "verifying", "completed", "failed", "cancelled"]),
      phase: requiredText,
      error: longText.optional(),
      latestAction: longText.optional(),
      retryCount: z.number().min(0).max(10).optional(),
      filesChanged: z.number().min(0).optional(),
      additions: z.number().min(0).optional(),
      deletions: z.number().min(0).optional(),
      accepted: z.boolean().nullable().optional()
    })
  }),
  z.object({
    type: z.literal("toggleTask"),
    payload: z.object({ id: requiredText })
  }),
  z.object({
    type: z.literal("addTask"),
    payload: z.object({
      title: requiredText,
      priority: prioritySchema,
      project: optionalText,
      goalId: optionalText,
      due: optionalText,
      plannedDate: optionalText,
      todayFocus: z.boolean().optional(),
      recurrenceRule: recurrenceRuleSchema.optional(),
      reminderTime: optionalText
    })
  }),
  z.object({
    type: z.literal("updateTask"),
    payload: z.object({
      id: requiredText,
      title: requiredText,
      priority: prioritySchema,
      project: optionalText,
      goalId: optionalText,
      due: optionalText,
      plannedDate: optionalText,
      todayFocus: z.boolean().optional(),
      status: z.enum(["inbox", "planned", "in_progress", "completed", "cancelled", "archived"]).optional(),
      recurrenceRule: recurrenceRuleSchema.optional(),
      reminderTime: optionalText
    })
  }),
  z.object({
    type: z.literal("deleteTask"),
    payload: z.object({ id: requiredText })
  }),
  z.object({
    type: z.literal("addInbox"),
    payload: z.object({
      title: requiredText,
      type: z.enum(["text", "file", "link", "idea"]),
      category: requiredText
    })
  }),
  z.object({
    type: z.literal("updateInbox"),
    payload: z.object({
      id: requiredText,
      title: requiredText,
      type: z.enum(["text", "file", "link", "idea"]),
      category: requiredText,
      status: z.enum(["pending", "classified", "archived"])
    })
  }),
  z.object({
    type: z.literal("deleteInbox"),
    payload: z.object({ id: requiredText })
  }),
  z.object({
    type: z.literal("addPrompt"),
    payload: z.object({
      title: requiredText,
      category: requiredText,
      content: longText.min(1)
    })
  }),
  z.object({
    type: z.literal("updatePrompt"),
    payload: z.object({
      id: requiredText,
      title: requiredText,
      category: requiredText,
      content: longText.min(1),
      favorite: z.boolean()
    })
  }),
  z.object({
    type: z.literal("deletePrompt"),
    payload: z.object({ id: requiredText })
  }),
  z.object({
    type: z.literal("addNote"),
    payload: z.object({
      title: requiredText,
      type: requiredText,
      summary: longText
    })
  }),
  z.object({
    type: z.literal("updateNote"),
    payload: z.object({
      id: requiredText,
      title: requiredText,
      type: requiredText,
      summary: longText,
      favorite: z.boolean()
    })
  }),
  z.object({
    type: z.literal("deleteNote"),
    payload: z.object({ id: requiredText })
  }),
  z.object({
    type: z.literal("addFileRecord"),
    payload: z.object({
      name: requiredText,
      kind: requiredText,
      project: optionalText,
      size: optionalText,
      mimeType: optionalText,
      sourceUrl: optionalText,
      storagePath: optionalText
    })
  }),
  z.object({
    type: z.literal("deleteFile"),
    payload: z.object({ id: requiredText })
  }),
  z.object({
    type: z.literal("addLifeArea"),
    payload: z.object({
      name: requiredText,
      description: longText,
      icon: requiredText,
      privacyLevel: privacyLevelSchema
    })
  }),
  z.object({
    type: z.literal("updateLifeAreaStatus"),
    payload: z.object({
      id: requiredText,
      status: z.enum(["active", "paused", "archived"])
    })
  }),
  z.object({
    type: z.literal("addGoal"),
    payload: z.object({
      lifeAreaId: requiredText,
      title: requiredText,
      description: longText,
      motivation: longText,
      successCriteria: longText,
      priority: prioritySchema,
      targetDate: optionalText,
      nextAction: requiredText,
      progressMode: z.enum(["manual", "tasks", "habits"]),
      privacyLevel: privacyLevelSchema
    })
  }),
  z.object({
    type: z.literal("updateGoalProgress"),
    payload: z.object({
      id: requiredText,
      manualProgress: z.number().min(0).max(100),
      progressMode: z.enum(["manual", "tasks", "habits"])
    })
  }),
  z.object({
    type: z.literal("addHabit"),
    payload: z.object({
      name: requiredText,
      description: longText,
      lifeAreaId: optionalText,
      goalId: optionalText,
      frequencyType: z.enum(["daily", "weekly", "monthly", "custom"]),
      targetValue: z.number().min(0).optional(),
      unit: optionalText,
      reminderTime: optionalText,
      privacyLevel: privacyLevelSchema
    })
  }),
  z.object({
    type: z.literal("logHabit"),
    payload: z.object({
      habitId: requiredText,
      status: z.enum(["completed", "partial", "skipped", "missed"]),
      value: z.number().optional(),
      note: longText.optional()
    })
  }),
  z.object({
    type: z.literal("logRoutine"),
    payload: z.object({
      routineId: requiredText,
      completedStepIds: z.array(z.string()).max(100),
      status: z.enum(["completed", "skipped", "partial"])
    })
  }),
  z.object({
    type: z.literal("saveDailyCheckin"),
    payload: z.object({
      date: requiredText,
      sleepAt: optionalText,
      wakeAt: optionalText,
      sleepHours: z.number().min(0).max(24).optional(),
      sleepQuality: z.number().min(1).max(5).optional(),
      energy: z.number().min(1).max(5).optional(),
      mood: z.number().min(1).max(5).optional(),
      stress: z.number().min(1).max(5).optional(),
      exercise: optionalText,
      studyMinutes: z.number().min(0).optional(),
      workMinutes: z.number().min(0).optional(),
      note: longText.optional()
    })
  }),
  z.object({
    type: z.literal("saveDailyReview"),
    payload: z.object({
      date: requiredText,
      completed: longText,
      problems: longText,
      state: longText,
      tomorrowFocus: longText
    })
  }),
  z.object({
    type: z.literal("saveWeeklyReview"),
    payload: z.object({
      weekStart: requiredText,
      completedTaskIds: z.array(z.string()).max(500),
      unfinishedTaskIds: z.array(z.string()).max(500),
      projectChanges: longText,
      goalProgress: longText,
      habitCompletionRate: z.number().min(0).max(100),
      studyMinutes: z.number().min(0),
      sleepTrend: longText,
      moodTrend: longText,
      spendingSummaryPlaceholder: longText,
      nextWeekFocus: z.array(z.string().max(200)).max(20)
    })
  }),
  z.object({
    type: z.literal("resetData"),
    payload: z.object({}).optional()
  })
]);

export type MyOSAction = z.infer<typeof myOSActionSchema>;
