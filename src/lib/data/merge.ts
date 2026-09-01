import type { MyOSData } from "./models";
import { seedData } from "./seed";

export function mergeData(input: Partial<MyOSData>): MyOSData {
  return {
    ...seedData,
    ...input,
    projects: input.projects ?? seedData.projects,
    projectMilestones: input.projectMilestones ?? seedData.projectMilestones,
    projectRisks: input.projectRisks ?? seedData.projectRisks,
    tasks: input.tasks ?? seedData.tasks,
    inbox: input.inbox ?? seedData.inbox,
    prompts: input.prompts ?? seedData.prompts,
    notes: input.notes ?? seedData.notes,
    files: input.files ?? seedData.files,
    activities: input.activities ?? seedData.activities,
    automations: input.automations ?? seedData.automations,
    lifeAreas: input.lifeAreas ?? seedData.lifeAreas,
    goals: input.goals ?? seedData.goals,
    habits: input.habits ?? seedData.habits,
    habitLogs: input.habitLogs ?? seedData.habitLogs,
    routines: input.routines ?? seedData.routines,
    routineSteps: input.routineSteps ?? seedData.routineSteps,
    routineLogs: input.routineLogs ?? seedData.routineLogs,
    dailyCheckins: input.dailyCheckins ?? seedData.dailyCheckins,
    dailyReviews: input.dailyReviews ?? seedData.dailyReviews,
    weeklyReviews: input.weeklyReviews ?? seedData.weeklyReviews,
    agentAssignments: input.agentAssignments ?? seedData.agentAssignments,
    agentWorkItems: input.agentWorkItems ?? seedData.agentWorkItems,
    agentReports: input.agentReports ?? seedData.agentReports,
    agentWorkEvents: input.agentWorkEvents ?? seedData.agentWorkEvents,
    agentExecutions: input.agentExecutions ?? seedData.agentExecutions
  };
}
