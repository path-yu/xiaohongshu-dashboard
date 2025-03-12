import express, { Request, Response } from "express";
import path, { parse } from "path";
import { exec } from "child_process";
import { chromium, Browser, BrowserContext, Page } from "playwright";
import fs from "fs";
import { EventEmitter } from "events";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node"; // Use JSONFile adapter for Node.js
import cors from "cors"; // 引入 CORS 中间件
import cron from "node-cron";

import XhsClient from "./xhsClient.ts"; //
import {
  FeedType,
  NoteType,
  SearchSortType,
  SearchNoteType,
  Note,
} from "./enums.ts";
import {
  getRandomComment,
  getRandomDelay,
  getRandomKeyword,
  sleep,
} from "./help.ts";
import { ITask, ILog, TaskStatus, INote, TriggerType } from "./type.ts";

const app = express();
const port = 3000;
// 允许所有来源的请求
app.use(cors());
// 中间件以解析 JSON 请求体
app.use(express.json());
let xhs_client: XhsClient | null;
// 全局变量存储 a1 和 Playwright 实例
let A1 = "";
let webId = "";
let startUp = false;
let browser: Browser | null;
let context: BrowserContext | null;
let page: Page | null;
// 新增：全局状态变量
let playwrightStatus = "stopped"; // 默认状态为已停止
// // 创建事件发射器用于状态管理
const statusEmitter = new EventEmitter();

let localFilePath = path.join(process.cwd(), "local.json");
let localData = fs.readFileSync(localFilePath, "utf8");
// File paths for storing tasks and logs
const TASKS_FILE = path.join(process.cwd(), "tasks.json");
const LOGS_FILE = path.join(process.cwd(), "logs.json");
// / Initialize LowDB instances
// 初始化 tasksDb
const tasksAdapter = new JSONFile<ITask[]>(TASKS_FILE);
const tasksDb = new Low<ITask[]>(tasksAdapter, []);

// 初始化 logsDb
const logsAdapter = new JSONFile<ILog[]>(LOGS_FILE);
const logsDb = new Low<ILog[]>(logsAdapter, []);
// Map to store cron jobs for interval tasks
const cronJobs = new Map();
// Map to store abort controllers for immediate tasks
const immediateTaskControllers = new Map();

// Initialize databases with default values if empty
export const initializeDatabases = async (): Promise<void> => {
  try {
    await tasksDb.read();
    await logsDb.read();
    tasksDb.data = tasksDb.data || [];
    logsDb.data = logsDb.data || [];

    tasksDb.data = tasksDb.data.map((task) => {
      if (
        task.status === "running" ||
        task.status === "paused" ||
        task.status === "error"
      ) {
        return {
          ...task,
          status: "idle",
          updatedAt: new Date().toISOString(),
          error: "",
          completedComments: 0,
        } as ITask; // 显式断言为 ITask
      }
      return task;
    }) as ITask[]; // 显式断言整个数组为 ITask[]

    await tasksDb.write();
    await logsDb.write();
    console.log("Databases initialized and task statuses reset");
  } catch (error) {
    console.error("Failed to initialize databases:", error);
  }
};

// Function to fetch all search notes
const fetchSearchNotes = async (keyword, sortType, note_type = 0) => {
  try {
    // Simulate fetching a single note (modify this based on your actual API)
    const response = await xhs_client!.get_note_by_keyword(
      keyword,
      1,
      20,
      sortType,
      note_type
    );
    return response.items || []; // Return an array with one note or empty if none
  } catch (error) {
    console.error(`Failed to fetch note for keywords "${keyword}":`, error);
    return [];
  }
};
const executeTask = async (task) => {
  if (task.status !== "running" || task.completedComments >= task.maxComments) {
    return;
  }
  const controller = immediateTaskControllers.get(task.id) as AbortController;
  let currentTask = tasksDb.data.find((t) => t.id === task.id)!;
  if (!currentTask) return;
  let taskId = currentTask.id;
  try {
    // Read logs once to get commented note IDs
    await logsDb.read();
    const commentedNoteIds = new Set(logsDb.data.map((log) => log.noteId));
    // Track fetched note IDs to avoid duplicates
    const fetchedNoteIds = new Set();

    // Outer loop to fetch notes until maxComments is reached
    while (
      currentTask.status === "running" &&
      currentTask.completedComments < currentTask.maxComments &&
      !controller.signal.aborted
    ) {
      let notes: INote[] = [];
      // Fetch notes based on task type with a random keyword
      if (task.type === "search") {
        const randomKeyword = getRandomKeyword(task.keywords); // Get random keyword
        notes = await fetchSearchNotes(
          randomKeyword, // Pass random keyword
          task.sortType,
          task.noteType
        );
      } else if (task.type === "homepage") {
        notes = await fetchHomepageNotes(); // No keywords for homepage
      }
      if (!notes.length) {
        console.log(`No more notes available for task ${task.id}`);
        break; // Exit if no notes are fetched
      }
      // Filter out already fetched notes
      notes = notes.filter((note) => !fetchedNoteIds.has(note.id));
      if (!notes.length) {
        console.log(`All fetched notes were duplicates for task ${task.id}`);
        continue; // Fetch next set if all notes were duplicates
      }
      // Add all fetched note IDs to the set
      notes.forEach((note) => fetchedNoteIds.add(note.id));

      // Process each note in the fetched set
      await tasksDb.read();
      currentTask = tasksDb.data.find((t) => t.id === task.id)!;
      if (!currentTask) {
        console.log(`Task ${task.id} not found in database`);
        break;
      }
      for (const note of notes) {
        if (
          controller.signal.aborted &&
          currentTask.triggerType == TriggerType.Immediate
        ) {
          deleteImmediateController(taskId);
          console.log(`Task ${task.id} aborted`);
          break;
        }

        if (
          currentTask.status !== "running" ||
          currentTask.completedComments >= currentTask.maxComments
        ) {
          console.log(
            `Task ${task.id} stopped: status=${currentTask.status}, completed=${currentTask.completedComments}`
          );
          break;
        }

        // Skip if already commented
        if (commentedNoteIds.has(note.id)) {
          console.log(`Note ${note.id} already commented, skipping`);
          continue;
        }

        const comment = getRandomComment(task.comments, task.useRandomEmoji);
        await sleep(getRandomDelay(task.minDelay, task.maxDelay) * 1000);
        try {
          if (
            controller.signal.aborted &&
            currentTask.triggerType === TriggerType.Immediate
          ) {
            deleteImmediateController(taskId);
            console.log(`Task ${task.id} aborted`);
            break;
          }
          // // Perform the comment action
          // await xhs_client.comment_note(note.id, comment, note.xsec_token);
          console.log(`Commenting on note ${note.id} for task ${task.id}`);
          // // Update task progress
          currentTask.completedComments += 1;
          commentedNoteIds.add(note.id); // Add to commented set
          await updateTaskData(
            task.id,
            "completedComments",
            currentTask.completedComments
          );
          broadcastTaskUpdate();

          // // Log the successful comment
          // await addCommentLog(
          //   task.id,
          //   note.id,
          //   note.note_card?.display_title || "Unknown Title",
          //   comment,
          //   true
          // );

          // Check if maxComments is reached
          if (currentTask.completedComments >= currentTask.maxComments) {
            currentTask.status = TaskStatus.Completed;
            await updateTaskData(task.id, "status", "completed");
            console.log(`Task ${task.id} completed: reached maxComments`);
            deleteImmediateController(taskId);
          }
        } catch (error) {
          // Log failed comment attempt but continue with next note
          await addCommentLog(
            task.id,
            note.id,
            note.note_card?.display_title || "Unknown Title",
            comment,
            false,
            error.message
          );
          console.error(
            `Failed to comment on note ${note.id} for task ${task.id}:`,
            error
          );
        }
      }
    }
  } catch (error) {
    console.error(`Task ${task.id} execution failed:`, error);
    await tasksDb.read();
    const taskIndex = tasksDb.data.findIndex((t) => t.id === task.id);
    if (taskIndex !== -1) {
      tasksDb.data[taskIndex].status = TaskStatus.Error;
      tasksDb.data[taskIndex].error = error.message;
      tasksDb.data[taskIndex].updatedAt = new Date().toISOString();
      await tasksDb.write();
    }
    deleteImmediateController(currentTask.id);
  }
};
// Function to fetch homepage notes
const fetchHomepageNotes = async () => {
  try {
    const result = await xhs_client!.get_home_feed(FeedType.RECOMMEND);
    return result.items || []; // Assuming items contains the notes
  } catch (error) {
    console.error("Failed to fetch homepage notes:", error);
    return [];
  }
};
export const updateTaskData = async (
  id: string,
  key: keyof ITask,
  val: any
): Promise<void> => {
  await tasksDb.read();
  const taskIndex = tasksDb.data.findIndex((t) => t.id === id);
  if (taskIndex !== -1) {
    const currentTask = tasksDb.data[taskIndex]; // 类型为 ITask
    tasksDb.data[taskIndex] = {
      ...currentTask,
      [key]: val,
      updatedAt: new Date().toISOString(),
    } as ITask; // 显式断言
    await tasksDb.write();
  }
};
// Function to execute a task with pause support and direct status updates

// Task scheduler with pause support
const scheduleTasks = async ({
  startUp = false as boolean,
  tasks = [] as ITask[],
}: {
  startUp?: boolean;
  tasks?: ITask[];
}) => {
  let taskList: ITask[] = [];
  if (tasks.length) {
    taskList = tasks;
  } else {
    await tasksDb.read();
    taskList = tasksDb.data;
  }
  for (let task of taskList) {
    if (
      task.triggerType === "immediate" &&
      startUp === true &&
      !task.executeOnStartup
    ) {
      continue;
    }
    const existingCronJob = cronJobs.get(task.id);
    // Stop cron job if task is no longer running (for interval tasks)
    if (existingCronJob && task.status !== "running") {
      existingCronJob.stop();
      cronJobs.delete(task.id);
      console.log(`Stopped cron job for task ${task.id}`);
      continue;
    }
    // Handle  task pausing
    if (task.status === "paused") {
      stopTask(task.id);
      continue;
    }
    if (task.status === "completed" || task.status === "error") {
      continue; // Skip unless restarted
    }
    if (
      task.status === "running" &&
      task.completedComments >= task.maxComments
    ) {
      task.completedComments = 0;
      task.error = "";
      task.status = TaskStatus.Idle;
      await tasksDb.write();
      if (task.triggerType === TriggerType.Immediate) {
        executeTask(task);
      }
    }

    if (task.status === "idle") {
      if (task.triggerType === "immediate") {
        task.status = TaskStatus.Running;
        const controller = new AbortController();
        immediateTaskControllers.set(task.id, controller);
        task.completedComments = 0; // Reset completedComments on first start
        tasksDb.write().then(() => executeTask(task));
      }
      if (task.triggerType === "scheduled" && task.scheduleTime) {
        const scheduleTime = new Date(task.scheduleTime);
        if (scheduleTime <= new Date()) {
          task.status = TaskStatus.Running;
          tasksDb.write().then(() => executeTask(task));
        } else {
          cron.schedule(
            `${scheduleTime.getSeconds()} ${scheduleTime.getMinutes()} ${scheduleTime.getHours()} ${scheduleTime.getDate()} ${
              scheduleTime.getMonth() + 1
            } *`,
            () => {
              task.status = TaskStatus.Running;
              tasksDb.write().then(() => executeTask(task));
            },
            { scheduled: true }
          );
        }
      }
      if (task.triggerType === "interval" && task.intervalMinutes) {
        task.status = TaskStatus.Running;
        tasksDb.write().then(() => {
          const job = cron.schedule(`*/${task.intervalMinutes} * * * *`, () => {
            executeTask(task);
          });
          cronJobs.set(task.id, job);
          console.log(`Scheduled interval task ${task.id}`);
        });
      }
    }
  }
};
export const deleteImmediateController = (id: any) => {
  immediateTaskControllers.delete(id);
};
// New function to stop a task
export const stopTask = (taskId, reason = "unknown") => {
  // Stop immediate task
  const controller = immediateTaskControllers.get(taskId);
  if (controller) {
    controller.abort();
    console.log(`Immediate task ${taskId} stopped due to ${reason}`);
  }

  // Stop interval task
  const cronJob = cronJobs.get(taskId);
  if (cronJob) {
    cronJob.stop();
    cronJobs.delete(taskId);
    console.log(`Cron job for task ${taskId} stopped due to ${reason}`);
  }
};
// 定义 SSE 客户端接口
interface SSEClient {
  id: string; // 唯一标识符
  res: Response; // Express 的 Response 对象
}
// Function to add a comment log
const addCommentLog = async (
  taskId,
  noteId,
  noteTitle,
  comment,
  success,
  error
) => {
  try {
    await logsDb.read();
    const newLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      noteId,
      noteTitle,
      comment,
      timestamp: new Date().toISOString(),
      success,
      error: error || undefined,
    };
    logsDb.data.push(newLog);
    await logsDb.write();

    await tasksDb.read();
    const taskIndex = tasksDb.data.findIndex((t) => t.id === taskId);
    if (taskIndex !== -1 && success) {
      tasksDb.data[taskIndex].completedComments += 1;
      tasksDb.data[taskIndex].updatedAt = new Date().toISOString();
      if (
        tasksDb.data[taskIndex].completedComments >=
        tasksDb.data[taskIndex].maxComments
      ) {
        tasksDb.data[taskIndex].status = TaskStatus.Running;
      }
      await tasksDb.write();
    }

    return newLog;
  } catch (err) {
    console.error("Failed to add comment log:", err);
  }
};

// Broadcast task updates to all SSE clients
export const broadcastTaskUpdate = async () => {
  await tasksDb.read();
  const data = JSON.stringify(tasksDb.data);
  sseClients.forEach((client) => {
    client.res.write(`data: ${data}\n\n`);
  });
};
// 使用 Set 存储 SSE 客户端
const sseClients: Set<SSEClient> = new Set();
// SSE endpoint for real-time task updates
app.get("/api/auto-action/tasks/sse", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // Ensure headers are sent immediately

  // 创建客户端对象
  const client: SSEClient = {
    id: (req.query.clientId as string) || Date.now().toString(), // 确保唯一性
    res,
  };

  // 添加到 Set
  sseClients.add(client);

  // Send initial task list
  tasksDb.read().then(() => {
    res.write(`data: ${JSON.stringify(tasksDb.data)}\n\n`);
  });

  // Clean up when client disconnects
  req.on("close", () => {
    sseClients.delete(client);
    res.end();
  });
});
// Create a new task
app.post("/api/auto-action/tasks", async (req, res) => {
  try {
    const request = req.body;
    await tasksDb.read();

    const newTask = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: request.type,
      status: TaskStatus.Idle,
      keywords: Array.isArray(request.keywords)
        ? request.keywords
        : [request.keywords], // Ensure keyword is an array
      sortType: request.sortType || undefined,
      noteType: request.noteType || undefined,
      comments: request.comments,
      useRandomComment: request.useRandomComment,
      useRandomEmoji: request.useRandomEmoji,
      minDelay: request.minDelay,
      maxDelay: request.maxDelay,
      maxComments: request.maxComments,
      completedComments: 0,
      triggerType: request.triggerType,
      scheduleTime: request.scheduleTime || undefined,
      intervalMinutes: request.intervalMinutes || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      executeOnStartup: request.executeOnStartup || false,
      rescheduleAfterUpdate: request.rescheduleAfterUpdate || true,
      error: "",
    } as ITask;

    tasksDb.data.push(newTask);
    await tasksDb.write();
    scheduleTasks({ tasks: [newTask] }); // Reschedule tasks after adding a new one

    res.json({
      success: true,
      message: "Task created successfully",
      data: newTask,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create task",
      error: error.message,
    });
  }
});
// Get all tasks
app.get("/api/auto-action/tasks", async (req, res) => {
  try {
    await tasksDb.read();
    res.json({
      success: true,
      message: "Tasks retrieved successfully",
      data: tasksDb.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get tasks",
      data: [],
      error: error.message,
    });
  }
});
// Get a specific task
app.get("/api/auto-action/tasks/:taskId", async (req, res) => {
  try {
    await tasksDb.read();
    const task = tasksDb.data.find((t) => t.id === req.params.taskId);
    if (!task) {
      res.status(404).json({ success: false, message: "Task not found" });
    }
    res.json({
      success: true,
      message: "Task retrieved successfully",
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get task",
      error: error.message,
    });
  }
});
// Update task status
app.post("/api/auto-action/tasks/:taskId/status", async (req, res) => {
  try {
    const { status } = req.body;
    await tasksDb.read();
    const taskIndex = tasksDb.data.findIndex((t) => t.id === req.params.taskId);
    if (taskIndex === -1) {
      res.status(404).json({ success: false, message: "Task not found" });
      return;
    }

    const currentTask = tasksDb.data[taskIndex];
    let execute = false;
    // Handle status transitions
    if (currentTask.status === "running" && status === "completed") {
      stopTask(currentTask.id, "status change to completed");
    }

    if (currentTask.status === "paused" && status === "running") {
      // Resume immediate task by resetting controller and starting execution
      stopTask(currentTask.id, "clearing paused state"); // Clear any existing controller
      // Update the task status
      tasksDb.data[taskIndex].status = status;
      await tasksDb.write();
      if (currentTask.triggerType === "immediate") {
        const controller = new AbortController();
        immediateTaskControllers.set(currentTask.id, controller);
        execute = true;
        executeTask(tasksDb.data[taskIndex]);
      }
    }
    // Update the task status
    tasksDb.data[taskIndex].status = status;
    tasksDb.data[taskIndex].updatedAt = new Date().toISOString();
    await tasksDb.write();
    if (!execute) {
      scheduleTasks({ tasks: [tasksDb.data[taskIndex]] }); // Reschedule tasks after adding a new one
    }

    res.json({
      success: tasksDb.data[taskIndex],
      message: "Task status updated successfully",
      data: tasksDb.data[taskIndex],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update task status",
      error: error.message,
    });
  }
});
// Edit a specific task
app.put("/api/auto-action/tasks/:taskId", async (req, res) => {
  try {
    await tasksDb.read();
    const taskIndex = tasksDb.data.findIndex((t) => t.id === req.params.taskId);
    if (taskIndex === -1) {
      res.status(404).json({ success: false, message: "Task not found" });
      return;
    }

    // Get the existing task
    const existingTask = tasksDb.data[taskIndex];

    // Update only the provided fields from the request body
    const updatedTask = {
      ...existingTask,
      ...req.body, // Merge new fields from request body
      id: existingTask.id, // Prevent ID from being overwritten
      updatedAt: new Date().toISOString(), // Update timestamp
    };

    // Optional: Validate required fields or specific constraints
    if (!updatedTask.type || !updatedTask.maxComments) {
      res.status(400).json({
        success: false,
        message: "Task type and maxComments are required",
      });
    }
    // Update the task in the database
    tasksDb.data[taskIndex] = updatedTask;
    await tasksDb.write();
    if (req.body.rescheduleAfterUpdate) {
      // Resume immediate task by resetting controller and starting execution
      stopTask(existingTask.id, "clearing paused state"); // Clear any existing controller
      const controller = new AbortController();
      immediateTaskControllers.set(existingTask.id, controller);
      // Trigger scheduleTasks to handle any further cleanup or rescheduling
      scheduleTasks({ tasks: [updatedTask] }); // Reschedule tasks after adding a new one
    }
    res.json({
      success: true,
      message: "Task updated successfully",
      data: updatedTask,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update task",
      error: error.message,
    });
  }
});
// Delete a task
app.delete("/api/auto-action/tasks/:taskId", async (req, res) => {
  try {
    await tasksDb.read();
    const taskIndex = tasksDb.data.findIndex((t) => t.id === req.params.taskId);
    if (taskIndex === -1) {
      res.status(404).json({ success: false, message: "Task not found" });
      return;
    }

    const task = tasksDb.data[taskIndex];

    // Stop the task if it's running
    if (task.status === "running") {
      stopTask(req.params.taskId);
    }

    // Remove the task from the database
    tasksDb.data.splice(taskIndex, 1); // More efficient than filter for single removal
    await tasksDb.write();

    res.json({
      success: true,
      message: "Task deleted and stopped successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete task",
      error: error.message,
    });
  }
});
// Get logs for a specific task
app.get("/api/auto-action/tasks/:taskId/logs", async (req, res) => {
  try {
    await logsDb.read();
    const taskLogs = logsDb.data.filter(
      (log) => log.taskId === req.params.taskId
    );
    res.json({
      success: true,
      message: "Task logs retrieved successfully",
      data: taskLogs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get task logs",
      data: [],
      error: error.message,
    });
  }
});

// 签名函数
async function sign(uri, data, a1, webSession) {
  try {
    // 检查页面是否可用
    if (!page || page.isClosed()) {
      console.log("页面已关闭，尝试重新初始化 Playwright");
      await stopPlaywright();
      await initializePlaywright();
    }

    // 确保页面加载完成
    await page!.waitForLoadState("domcontentloaded");
    await page!.waitForFunction(
      () => typeof (window as any)._webmsxyw === "function",
      {
        timeout: 10000,
      }
    );

    const encryptParams = await page!.evaluate(
      ([url, data]) => {
        return (window as any)._webmsxyw(url, data);
      },
      [uri, data]
    );

    console.log("签名成功", data);
    return {
      "x-s": encryptParams["X-s"],
      "x-t": encryptParams["X-t"].toString(),
    };
  } catch (error) {
    console.error("签名失败:", error);
    throw error; // 抛出错误让调用方处理
  }
}

// 路由：签名 endpoint
app.post("/sign", async (req, res) => {
  const { uri, data, a1, web_session } = req.body;
  try {
    const result = await sign(uri, data, A1, web_session);
    res.json(result);
    console.log("签名成功", result);
  } catch (error) {
    console.error("签名失败:", error);
    res.status(500).json({ error: "签名失败" });
  }
});

// 路由：获取 a1
app.get("/api/a1", (req, res) => {
  res.json({ a1: A1 });
});

// 路由：控制 Playwright 启动和停止
app.post("/api/control", async (req, res) => {
  const { action } = req.body;

  if (action === "start") {
    if (!browser) {
      await initializePlaywright();
      res.json({ message: "Playwright 已启动" });
    } else {
      res.status(400).json({ error: "Playwright 已经在运行中" });
    }
  } else if (action === "stop") {
    if (browser) {
      await stopPlaywright();
      res.json({ message: "Playwright 已停止" });
    } else {
      res.status(400).json({ error: "Playwright 未启动" });
    }
  } else {
    res.status(400).json({ error: "无效的操作。请使用 'start' 或 'stop'" });
  }
});
// Playwright 配置和初始化
const initializePlaywright = async (startUp = false) => {
  try {
    playwrightStatus = "loading"; // 设置为加载中
    console.log("正在启动 Playwright");
    statusEmitter.emit("statusUpdate"); // 触发状态更新
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    // 使用 path.join 指定当前目录下的 stealth.min.js
    const stealthJsPath = path.join(process.cwd(), "stealth.min.js");
    // 读取 stealth.min.js 内容
    const stealthScript = fs.readFileSync(stealthJsPath, "utf8");
    await context.addInitScript(stealthScript);
    page = await context.newPage();
    // 访问小红书首页
    console.log("正在跳转至小红书首页");
    await page.goto("https://www.xiaohongshu.com");
    // 等待 window._webmsxyw 加载
    await page.waitForFunction(
      () => typeof (window as any)._webmsxyw === "function"
    );
    console.log("window._webmsxyw 已加载");
    await new Promise((resolve) => setTimeout(resolve, 5000)); // 等待 5 秒
    await page.reload();
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待 1 秒
    // 获取 Cookie 中的 a1
    const cookies = await context.cookies();
    for (const cookie of cookies) {
      if (cookie.name === "webId") {
        webId = cookie.value;
        console.log(
          `当前浏览器 Cookie 中 webId 值为：${cookie.value}，请将需要使用的 webId 设置成一样方可签名成功`
        );
      }
      if (cookie.name === "a1") {
        A1 = cookie.value;
        console.log(
          `当前浏览器 Cookie 中 a1 值为：${cookie.value}，请将需要使用的 a1 设置成一样方可签名成功`
        );
      }
    }
    console.log("跳转小红书首页成功，等待调用");
    scheduleTasks({ startUp: true });
    playwrightStatus = "running"; // 初始化完成后设置为运行中
    statusEmitter.emit("statusUpdate");
    localData = fs.readFileSync(localFilePath, "utf8");
    if (localData) {
      xhs_client = new XhsClient({
        cookie: `a1=${A1};webId=${webId};web_session=${
          JSON.parse(localData).web_session
        }`,
        signFunc: sign,
      });
      // xhs_client.comment_note(
      //   "67cc7ae5000000000302817b",
      //   "第一",
      //   "ABDQQ7qbuB6fWJoZnzkW49LwaOEipliX-kiWxkqdnv61M"
      // );
    }
  } catch (error) {
    playwrightStatus = "stopped";
    statusEmitter.emit("statusUpdate");
    return {
      error: error.message,
    };
  }
};
// 停止 Playwright
const stopPlaywright = async () => {
  if (browser) {
    await browser.close();
    browser = null;
    context = null;
    page = null;
    console.log("Playwright 浏览器已关闭");
    playwrightStatus = "stopped"; // 关闭后设置为已停止
  } else {
    console.log("Playwright 浏览器未启动");
    playwrightStatus = "stopped";
  }
  statusEmitter.emit("statusUpdate"); // 触发状态更新
};
app.get("/api/homefeed/recommend", async (req, res) => {
  try {
    const feedData = await xhs_client!.get_home_feed(
      (req.query.feed_type as FeedType.RECOMMEND) || FeedType.RECOMMEND
    );
    res
      .status(200)
      .json({ success: true, data: feedData, message: "获取首页推荐数据成功" });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      data: error.response?.data,
    });
  }
});
// 路由：设置 web_session
app.post("/api/set-web-session", (req, res) => {
  const { web_session } = req.body;
  const fileData = fs.readFileSync(localFilePath);
  let parseData = JSON.parse(fileData.toString());
  // 更新
  if (parseData["web_session"] !== web_session) {
    stopPlaywright();
    setTimeout(() => {
      initializePlaywright();
    }, 300);
  }
  if (web_session) {
    // 将 web_session 保存到本地文件中
    fs.writeFile(localFilePath, JSON.stringify({ web_session }), (err) => {
      if (err) {
        console.error("写入文件失败", err);
        res.status(500).json({ error: "保存 web_session 失败" });
      } else {
        console.log("web_session 已保存");
        res.json({ message: "web_session 保存成功" });
      }
    });
  } else {
    res.status(400).json({ error: "web_session 不能为空" });
  }
});
// 路由：获取 web_session
app.get("/api/get-web-session", (req, res) => {
  fs.readFile(localFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("读取文件失败", err);
      res.status(500).json({ error: "读取 web_session 失败" });
    } else {
      res.json({ web_session: data });
    }
  });
});
app.get("/api/search/notes", async (req, res) => {
  try {
    if (!xhs_client) {
      throw new Error("XhsClient 未初始化，请先启动 Playwright");
    }
    const {
      keyword,
      page = 1,
      page_size = 20,
      sort = SearchSortType.GENERAL,
      note_type = SearchNoteType.ALL,
    } = req.query as any;
    const result = await xhs_client.get_note_by_keyword(
      keyword as string,
      parseInt(page),
      parseInt(page_size),
      sort,
      parseInt(note_type)
    );
    res.status(200).json({
      success: true,
      data: result,
      message: "搜索笔记成功",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      data: error.response ? error.response.data : null,
    });
  }
});
app.post("/api/comment/note", async (req, res) => {
  try {
    if (!xhs_client) {
      throw new Error("XhsClient 未初始化，请先启动 Playwright");
    }
    const { note_id, content, xsec_token } = req.body;
    if (!note_id || !content) {
      throw new Error("note_id 和 content 为必填参数");
    }
    const result = await xhs_client.comment_note(note_id, content, xsec_token);
    res.status(200).json({
      success: true,
      data: result,
      message: "评论笔记成功",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      data: error.response ? error.response.data : null,
    });
  }
});
// 获取首页分类数据
app.get("/api/homefeed/categories", async (req, res) => {
  try {
    if (!xhs_client) {
      throw new Error("XhsClient 未初始化，请先启动 Playwright");
    }
    const categories = await xhs_client.get_home_feed_category();
    res.status(200).json({
      success: true,
      data: categories,
      message: "获取首页分类数据成功",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      data: error.response ? error.response.data : null,
    });
  }
});
// SSE 路由
app.get("/api/playwright/status", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // 发送状态的函数
  const sendStatus = async () => {
    try {
      let statusMessage;
      switch (playwrightStatus) {
        case "loading":
          statusMessage = "Playwright 正在加载";
          break;
        case "running":
          statusMessage = "Playwright 正在运行";
          break;
        case "stopped":
          statusMessage = "Playwright 已停止";
          break;
        default:
          statusMessage = "未知状态";
      }

      if (
        playwrightStatus === "running" &&
        (!browser || (await browser.contexts()).length === 0)
      ) {
        playwrightStatus = "stopped";
        statusMessage = "Playwright 已停止（检测到异常）";
      }

      const data = {
        status: playwrightStatus,
        message: statusMessage,
        timestamp: new Date().toISOString(),
      };
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      const errorData = {
        error: "查询 Playwright 状态失败",
        message: error.message,
      };
      res.write(`data: ${JSON.stringify(errorData)}\n\n`);
    }
  };

  // 初次连接时发送当前状态
  sendStatus();

  // 监听状态更新事件
  const statusListener = () => sendStatus();
  statusEmitter.on("statusUpdate", statusListener);

  // 清理连接
  req.on("close", () => {
    statusEmitter.off("statusUpdate", statusListener);
    res.end();
  });
});
app.listen(port, async () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(process.platform);

  if (localData) {
    let data = JSON.parse(localData).web_session;

    if (data) {
      // Call initialization on startup
      await initializeDatabases();
      await initializePlaywright(true);
    }
  }
  // 可选：打开浏览器
  // if (process.platform === "win32") {
  //   exec(`start http://localhost:${port}`);
  // } else if (process.platform === "darwin") {
  //   exec(`open http://localhost:${port}`);
  // } else if (process.platform === "linux") {
  //   exec(`xdg-open http://localhost:${port}`);
  // }
});
// 将 dist 目录指向正确的路径，确保访问静态资源
app.use(express.static(path.join(process.cwd(), "dist")));
// 默认返回首页 HTML
app.get("*", (req, res, next) => {
  const filePath = path.join(process.cwd(), "dist", "index.html");
  res.sendFile(filePath, (err) => {
    if (err) {
      // 如果文件不存在或发送失败，交给下一个中间件处理
      next(err);
    }
  });
});
// 404 处理中间件（放在所有路由之后）
app.use((req, res, next) => {
  res.status(404).send("404 - 页面未找到");
  // 或者返回 JSON 格式：
  // res.status(404).json({ error: '404 - 资源未找到' });
});
