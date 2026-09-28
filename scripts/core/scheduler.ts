/**
 * Jules Task Scheduler for managing and executing scheduled and autonomous background tasks.
 * @module core/scheduler
 */

import * as fs from 'fs';
import * as path from 'path';
import { ScheduledTask } from './types';
import { getProjectDirs } from './storage';

/**
 * Loads scheduled tasks from local companion storage.
 *
 * @param targetDir - The root project directory path.
 * @returns Array of ScheduledTask objects.
 */
export function loadScheduledTasks(targetDir: string = process.cwd()): ScheduledTask[] {
  const dirs = getProjectDirs(targetDir);
  const file = path.join(dirs.julesDir, 'schedules.json');
  if (!fs.existsSync(file)) return [];
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw) as ScheduledTask[];
  } catch {
    return [];
  }
}

/**
 * Persists scheduled tasks to the local state file.
 *
 * @param tasks - Array of ScheduledTask objects to store.
 * @param targetDir - The root project directory path.
 */
export function saveScheduledTasks(tasks: ScheduledTask[], targetDir: string = process.cwd()): void {
  const dirs = getProjectDirs(targetDir);
  if (!fs.existsSync(dirs.julesDir)) {
    fs.mkdirSync(dirs.julesDir, { recursive: true });
  }
  const file = path.join(dirs.julesDir, 'schedules.json');
  fs.writeFileSync(file, JSON.stringify(tasks, null, 2), 'utf8');
}

/**
 * Schedules a new autonomous task for future execution.
 *
 * @param task - Task parameters without ID, createdAt, or initial status.
 * @param targetDir - The root project directory path.
 * @returns The newly created ScheduledTask record.
 */
export function addScheduledTask(
  task: Omit<ScheduledTask, 'id' | 'createdAt' | 'status'>,
  targetDir: string = process.cwd()
): ScheduledTask {
  const tasks = loadScheduledTasks(targetDir);
  const id = `sched-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const newTask: ScheduledTask = {
    ...task,
    id,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  tasks.push(newTask);
  saveScheduledTasks(tasks, targetDir);
  return newTask;
}

/**
 * Cancels a pending scheduled task.
 *
 * @param taskId - The unique ID of the scheduled task.
 * @param targetDir - The root project directory path.
 * @returns True if task was found and cancelled; false otherwise.
 */
export function cancelScheduledTask(taskId: string, targetDir: string = process.cwd()): boolean {
  const tasks = loadScheduledTasks(targetDir);
  const item = tasks.find(t => t.id === taskId);
  if (!item || item.status !== 'pending') return false;
  item.status = 'cancelled';
  saveScheduledTasks(tasks, targetDir);
  return true;
}

/**
 * Deletes a scheduled task from storage.
 *
 * @param taskId - The unique ID of the scheduled task.
 * @param targetDir - The root project directory path.
 * @returns True if task was found and deleted; false otherwise.
 */
export function deleteScheduledTask(taskId: string, targetDir: string = process.cwd()): boolean {
  const tasks = loadScheduledTasks(targetDir);
  const initialLen = tasks.length;
  const filtered = tasks.filter(t => t.id !== taskId);
  if (filtered.length === initialLen) return false;
  saveScheduledTasks(filtered, targetDir);
  return true;
}

/**
 * Retrieves all pending scheduled tasks that are due for execution at the reference time.
 *
 * @param targetDir - The root project directory path.
 * @param now - Reference timestamp to check against (defaults to now).
 * @returns Array of due ScheduledTask objects.
 */
export function getDueScheduledTasks(
  targetDir: string = process.cwd(),
  now: Date = new Date()
): ScheduledTask[] {
  const tasks = loadScheduledTasks(targetDir);
  const nowIso = now.toISOString();
  return tasks.filter(t => t.status === 'pending' && t.scheduledAt <= nowIso);
}

/**
 * Executor function signature for scheduled task deployment.
 */
export type TaskExecutor = (options: {
  task: string;
  agents?: string;
  mode?: any;
  type?: 'start' | 'review' | 'interactive';
  branch?: string;
  targetDir?: string;
}) => Promise<{
  success: boolean;
  sessions?: Array<{ id: string }>;
  sessionId?: string;
  output?: string;
  error?: string;
}>;

let activeTaskExecutor: TaskExecutor | null = null;

/**
 * Sets the global task executor handler used by the scheduler.
 *
 * @param executor - The task executor implementation.
 */
export function setTaskExecutor(executor: TaskExecutor): void {
  activeTaskExecutor = executor;
}

/**
 * Retrieves the currently registered task executor handler.
 *
 * @returns The active TaskExecutor or null if none is registered.
 */
export function getTaskExecutor(): TaskExecutor | null {
  return activeTaskExecutor;
}

/**
 * Inspects all pending schedules and executes any that are due.
 *
 * @param targetDir - The root project directory path.
 * @param onExecute - Optional callback fired when a task executes with its result.
 * @param executor - Optional task executor override.
 * @returns Promise resolving to the number of successfully triggered tasks.
 */
export function executeDueTasks(
  targetDir: string = process.cwd(),
  onExecute?: (task: ScheduledTask, result: any) => void,
  executor?: TaskExecutor
): Promise<number> {
  const due = getDueScheduledTasks(targetDir);
  if (due.length === 0) return Promise.resolve(0);

  const runner = executor || activeTaskExecutor;
  if (!runner) return Promise.resolve(0);

  const tasks = loadScheduledTasks(targetDir);
  let executedCount = 0;

  return (async () => {
    for (const d of due) {
      const taskRecord = tasks.find(t => t.id === d.id);
      if (!taskRecord || taskRecord.status !== 'pending') continue;

      taskRecord.status = 'running';
      saveScheduledTasks(tasks, targetDir);

      try {
        const deployRes = await runner({
          task: d.task,
          agents: d.agent,
          mode: d.mode,
          type: d.type,
          branch: d.branch,
          targetDir
        });

        taskRecord.status = deployRes.success ? 'completed' : 'pending';
        let sessionId: string | undefined;
        if (deployRes.sessions && deployRes.sessions.length > 0) {
          sessionId = deployRes.sessions[0].id;
        } else if ((deployRes as any).sessionId) {
          sessionId = (deployRes as any).sessionId;
        } else if (deployRes.output) {
          const match = deployRes.output.match(/Session ID: ([a-zA-Z0-9_-]+)/);
          if (match) sessionId = match[1];
        }
        if (sessionId) {
          taskRecord.sessionId = sessionId;
        }
        executedCount++;
        if (onExecute) onExecute(taskRecord, deployRes);
      } catch {
        taskRecord.status = 'pending';
      }
    }
    saveScheduledTasks(tasks, targetDir);
    return executedCount;
  })();
}

/**
 * Executes a specific scheduled task immediately regardless of scheduledAt.
 *
 * @param taskId - The unique ID of the scheduled task.
 * @param targetDir - The root project directory path.
 * @param executor - Optional task executor override.
 * @returns Promise resolving to execution result.
 */
export async function runScheduledTaskNow(
  taskId: string,
  targetDir: string = process.cwd(),
  executor?: TaskExecutor
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  const runner = executor || activeTaskExecutor;
  if (!runner) {
    return { success: false, error: 'No task executor registered' };
  }

  const tasks = loadScheduledTasks(targetDir);
  const taskRecord = tasks.find(t => t.id === taskId);
  if (!taskRecord) {
    return { success: false, error: 'Task not found' };
  }
  taskRecord.status = 'running';
  saveScheduledTasks(tasks, targetDir);

  try {
    const deployRes = await runner({
      task: taskRecord.task,
      agents: taskRecord.agent,
      mode: taskRecord.mode,
      type: taskRecord.type,
      branch: taskRecord.branch,
      targetDir
    });

    taskRecord.status = deployRes.success ? 'completed' : 'pending';
    let sessionId: string | undefined;
    if (deployRes.sessions && deployRes.sessions.length > 0) {
      sessionId = deployRes.sessions[0].id;
    } else if ((deployRes as any).sessionId) {
      sessionId = (deployRes as any).sessionId;
    } else if (deployRes.output) {
      const match = deployRes.output.match(/Session ID: ([a-zA-Z0-9_-]+)/);
      if (match) sessionId = match[1];
    }
    if (sessionId) {
      taskRecord.sessionId = sessionId;
    }
    saveScheduledTasks(tasks, targetDir);
    return { success: deployRes.success, sessionId, error: deployRes.error };
  } catch (err: any) {
    taskRecord.status = 'pending';
    saveScheduledTasks(tasks, targetDir);
    return { success: false, error: err.message || String(err) };
  }
}

