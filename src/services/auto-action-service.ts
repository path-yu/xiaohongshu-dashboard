/**
 * Service for automated actions like commenting
 */
import { api } from "./api-service";

export enum TaskStatus {
  RUNNING = "running",
  PAUSED = "paused",
  ERROR = "error",
  COMPLETED = "completed",
  IDLE = "idle",
}

export enum TaskType {
  SEARCH = "search",
  HOMEPAGE = "homepage",
}

export enum TriggerType {
  IMMEDIATE = "immediate", // Start immediately
  SCHEDULED = "scheduled", // Start at scheduled time
  INTERVAL = "interval", // Run at intervals
}

export interface CommentTask {
  id: string;
  type: TaskType;
  status: TaskStatus;
  keywords?: string[]; // Changed from keyword to keywords array
  sortType?: number;
  noteType?: number;
  comments: string[];
  useRandomComment: boolean;
  useRandomEmoji: boolean;
  minDelay: number;
  maxDelay: number;
  maxComments: number;
  completedComments: number;
  triggerType: TriggerType;
  scheduleTime?: string;
  intervalMinutes?: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface CommentLog {
  id: string;
  taskId: string;
  noteId: string;
  noteTitle: string;
  comment: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface CreateTaskRequest {
  type: TaskType;
  keywords?: string[]; // Changed from keyword to keywords array
  sortType?: number;
  noteType?: number;
  comments: string[];
  useRandomComment: boolean;
  useRandomEmoji: boolean;
  minDelay: number;
  maxDelay: number;
  maxComments: number;
  triggerType: TriggerType;
  scheduleTime?: string;
  intervalMinutes?: number;
}

export interface TaskResponse {
  success: boolean;
  message: string;
  data?: CommentTask;
  error?: string;
}

export interface TasksResponse {
  success: boolean;
  message: string;
  data: CommentTask[];
  error?: string;
}

export interface LogsResponse {
  success: boolean;
  message: string;
  data: CommentLog[];
  error?: string;
}

/**
 * Create a new comment task
 */
export const createTask = async (
  request: CreateTaskRequest
): Promise<TaskResponse> => {
  try {
    return await api.post<TaskResponse>("api/auto-action/tasks", request);
  } catch (error) {
    console.error("Failed to create task:", error);
    return {
      success: false,
      message: "Failed to create task",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Get all tasks
 */
export const getTasks = async (): Promise<TasksResponse> => {
  try {
    return await api.get<TasksResponse>("api/auto-action/tasks");
  } catch (error) {
    console.error("Failed to get tasks:", error);
    return {
      success: false,
      message: "Failed to get tasks",
      data: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Get a specific task
 */
export const getTask = async (taskId: string): Promise<TaskResponse> => {
  try {
    return await api.get<TaskResponse>(`api/auto-action/tasks/${taskId}`);
  } catch (error) {
    console.error(`Failed to get task ${taskId}:`, error);
    return {
      success: false,
      message: "Failed to get task",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Update task status (start, pause, stop)
 */
export const updateTaskStatus = async (
  taskId: string,
  status: TaskStatus
): Promise<TaskResponse> => {
  try {
    return await api.post<TaskResponse>(
      `api/auto-action/tasks/${taskId}/status`,
      { status }
    );
  } catch (error) {
    console.error(`Failed to update task ${taskId} status:`, error);
    return {
      success: false,
      message: "Failed to update task status",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Delete a task
 */
export const deleteTask = async (
  taskId: string
): Promise<{ success: boolean; message: string; error?: string }> => {
  try {
    return await api.delete<{ success: boolean; message: string }>(
      `api/auto-action/tasks/${taskId}`
    );
  } catch (error) {
    console.error(`Failed to delete task ${taskId}:`, error);
    return {
      success: false,
      message: "Failed to delete task",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Get logs for a specific task
 */
export const getTaskLogs = async (taskId: string): Promise<LogsResponse> => {
  try {
    return await api.get<LogsResponse>(`api/auto-action/tasks/${taskId}/logs`);
  } catch (error) {
    console.error(`Failed to get logs for task ${taskId}:`, error);
    return {
      success: false,
      message: "Failed to get task logs",
      data: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Export logs as CSV
 */
export const exportLogsAsCsv = (logs: CommentLog[]): string => {
  if (logs.length === 0) {
    return "No logs to export";
  }

  // CSV header
  const header =
    "ID,Task ID,Note ID,Note Title,Comment,Timestamp,Success,Error\n";

  // CSV rows
  const rows = logs
    .map((log) => {
      return `"${log.id}","${log.taskId}","${log.noteId}","${
        log.noteTitle
      }","${log.comment.replace(/"/g, '""')}","${log.timestamp}","${
        log.success
      }","${log.error || ""}"`;
    })
    .join("\n");

  return header + rows;
};

/**
 * Download CSV file
 */
export const downloadCsv = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
