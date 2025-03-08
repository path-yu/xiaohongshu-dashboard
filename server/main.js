import express from "express";
import path from "path";
import { exec } from "child_process";
import { chromium } from "playwright";
import fs from "fs";
import { EventEmitter } from "events";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node"; // Use JSONFile adapter for Node.js
import cors from "cors"; // 引入 CORS 中间件

import XhsClient from "./xhsClient.js"; //
import {
  FeedType,
  NoteType,
  SearchSortType,
  SearchNoteType,
  Note,
} from "./enums.js";
import { sleep } from "./help.js";

const app = express();
const port = 3000;

// 允许所有来源的请求
app.use(cors());
// 中间件以解析 JSON 请求体
app.use(express.json());
let xhs_client;
// 全局变量存储 a1 和 Playwright 实例
let A1 = "";
let webId = "";

let browser = null;
let context = null;
let page = null;
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
const tasksAdapter = new JSONFile(TASKS_FILE);
const logsAdapter = new JSONFile(LOGS_FILE);
const tasksDb = new Low(tasksAdapter, []);
const logsDb = new Low(logsAdapter, []);
// Map to store cron jobs for interval tasks
const cronJobs = new Map();
// Map to store abort controllers for immediate tasks
const immediateTaskControllers = new Map();

// Initialize databases with default values if empty
export const initializeDatabases = async () => {
  try {
    await tasksDb.read();
    await logsDb.read();
    tasksDb.data = tasksDb.data || [];
    logsDb.data = logsDb.data || [];

    // Reset task statuses on initialization
    tasksDb.data = tasksDb.data.map((task) => {
      if (task.status === "running" || task.status === "paused") {
        return {
          ...task,
          status: "idle",
          updatedAt: new Date().toISOString(),
          error: "",
          completedComments: 0,
        };
      }
      return task; // Leave "completed" or "error" unchanged
    });

    await tasksDb.write();
    await logsDb.write();
    console.log("Databases initialized and task statuses reset");
  } catch (error) {
    console.error("Failed to initialize databases:", error);
  }
};

// Function to get random delay between min and max
const getRandomDelay = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
// Function to get random comment
const getRandomComment = (comments, useRandomEmoji) => {
  const comment = comments[Math.floor(Math.random() * comments.length)];
  const emojis = ["👍", "❤️", "😊", "🔥", "👏"];
  return useRandomEmoji
    ? `${comment} ${emojis[Math.floor(Math.random() * emojis.length)]}`
    : comment;
};

// Function to fetch all search notes
const fetchAllSearchNotes = async (
  keywords,
  sortType,
  maxNotes = 100,
  note_type = 0
) => {
  if (!Array.isArray(keywords) || keywords.length === 0) {
    throw new Error("Keywords must be a non-empty array");
  }
  let allNotes = [];
  let page = 1;
  const pageSize = 20;
  while (allNotes.length < maxNotes) {
    // Randomly select one keyword from the array
    const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
    try {
      const result = await xhs_client.get_note_by_keyword(
        randomKeyword,
        page,
        pageSize,
        sortType,
        note_type
      );

      const notes = result.items || [];
      allNotes = allNotes.concat(notes.slice(0, maxNotes - allNotes.length)); // Limit notes added
      if (notes.length < pageSize) break; // No more pages
      page += 1;
    } catch (error) {
      console.error(
        `Failed to fetch notes for keyword ${keyword}, page ${page}:`,
        error
      );
      break;
    }
  }

  return allNotes;
};

// Function to execute a task
// Function to fetch homepage notes
const fetchHomepageNotes = async () => {
  try {
    const result = await xhs_client.get_home_feed(FeedType.RECOMMEND);
    return result.items || []; // Assuming items contains the notes
  } catch (error) {
    console.error("Failed to fetch homepage notes:", error);
    return [];
  }
};

// Function to execute a task with pause support
// Function to execute a task with pause support and direct status updates
const executeTask = async (task) => {
  if (task.status !== "running" || task.completedComments >= task.maxComments)
    return;

  const controller = new AbortController();
  immediateTaskControllers.set(task.id, controller);

  try {
    let notes = [];
    if (task.type === "search") {
      let maxLength = task.maxComments - task.completedComments;

      notes = await fetchAllSearchNotes(
        task.keywords,
        task.sortType,
        maxLength
      );
    } else if (task.type === "homepage") {
      notes = await fetchHomepageNotes();
    }
    console.log(notes.length, "task");

    await tasksDb.read();
    let currentTask = tasksDb.data.find((t) => t.id === task.id);
    if (!currentTask) return; // Task might have been deleted

    for (const note of notes) {
      // Check abort signal and status before each iteration
      if (controller.signal.aborted) {
        console.log(`Task ${task.id} aborted`);
        break;
      }
      // Check status and completion condition
      if (
        currentTask.status !== "running" ||
        currentTask.completedComments >= currentTask.maxComments
      ) {
        break;
      }

      const comment = getRandomComment(task.comments, task.useRandomEmoji);
      try {
        await sleep(getRandomDelay(task.minDelay, task.maxDelay) * 1000);
        currentTask.completedComments += 1; // Increment directly
        // await xhs_client.comment_note(note.id, comment);
        // await addCommentLog(
        //   task.id,
        //   note.id,
        //   note.title || "Unknown Title",
        //   comment,
        //   true
        // );
        console.log(
          `Commented on note ${note.id} for task ${task.id}`,
          getRandomDelay(task.minDelay, task.maxDelay) * 1000
        );

        // Update task status if maxComments reached
        if (currentTask.completedComments >= currentTask.maxComments) {
          currentTask.status = "completed";
          console.log(`Task ${task.id} completed: reached maxComments`);
        }
      } catch (error) {
        await addCommentLog(
          task.id,
          note.id,
          note.note_card.display_title || "Unknown Title",
          comment,
          false,
          error.message
        );
        console.error(
          `Failed to comment on note ${note.id} for task ${task.id}:`,
          error
        );
      }

      // Persist changes to the database
      await tasksDb.read();
      const taskIndex = tasksDb.data.findIndex((t) => t.id === task.id);
      if (taskIndex !== -1) {
        tasksDb.data[taskIndex] = {
          ...currentTask,
          updatedAt: new Date().toISOString(),
        };
        await tasksDb.write();
        await broadcastTaskUpdate(); // Broadcast update after completedComments changes
      }
    }

    // Final check after loop
    await tasksDb.read();
    currentTask = tasksDb.data.find((t) => t.id === task.id);
    if (
      currentTask &&
      currentTask.completedComments >= currentTask.maxComments &&
      currentTask.status !== "completed"
    ) {
      currentTask.status = "completed";
      tasksDb.data[taskIndex] = {
        ...currentTask,
        updatedAt: new Date().toISOString(),
      };
      await tasksDb.write();
    }
  } catch (error) {
    console.error(`Task ${task.id} execution failed:`, error);
    await tasksDb.read();
    const taskIndex = tasksDb.data.findIndex((t) => t.id === task.id);
    if (taskIndex !== -1) {
      tasksDb.data[taskIndex].status = "error";
      tasksDb.data[taskIndex].error = error.message;
      tasksDb.data[taskIndex].updatedAt = new Date().toISOString();
      await tasksDb.write();
    }
  } finally {
    immediateTaskControllers.delete(task.id); // Clean up
  }
};

// Task scheduler with pause support
const scheduleTasks = () => {
  tasksDb.read().then(() => {
    tasksDb.data.forEach((task) => {
      const existingCronJob = cronJobs.get(task.id);

      // Stop cron job if task is no longer running (for interval tasks)
      if (existingCronJob && task.status !== "running") {
        existingCronJob.stop();
        cronJobs.delete(task.id);
        console.log(`Stopped cron job for task ${task.id}`);
      }

      // Handle immediate task pausing
      if (task.triggerType === "immediate" && task.status === "paused") {
        const controller = immediateTaskControllers.get(task.id);
        if (controller) {
          controller.abort(); // Attempt to abort, though limited by async nature
          immediateTaskControllers.delete(task.id);
          console.log(`Paused immediate task ${task.id}`);
        }
      }
      if (
        task.status === "running" &&
        task.completedComments >= task.maxComments
      ) {
        task.completedComments = 0;
        task.error = undefined;
        tasksDb.write().then(() => executeTask(task));
      } else if (task.status === "completed" || task.status === "error") {
        return; // Skip unless restarted
      } else if (task.status === "idle") {
        if (task.triggerType === "immediate") {
          task.status = "running";
          task.completedComments = 0; // Reset completedComments on first start
          tasksDb.write().then(() => executeTask(task));
        } else if (task.triggerType === "scheduled" && task.scheduleTime) {
          const scheduleTime = new Date(task.scheduleTime);
          if (scheduleTime <= new Date()) {
            task.status = "running";
            tasksDb.write().then(() => executeTask(task));
          } else {
            cron.schedule(
              `${scheduleTime.getSeconds()} ${scheduleTime.getMinutes()} ${scheduleTime.getHours()} ${scheduleTime.getDate()} ${
                scheduleTime.getMonth() + 1
              } *`,
              () => {
                task.status = "running";
                tasksDb.write().then(() => executeTask(task));
              },
              { scheduled: true }
            );
          }
        } else if (task.triggerType === "interval" && task.intervalMinutes) {
          task.status = "running";
          tasksDb.write().then(() => {
            const job = cron.schedule(
              `*/${task.intervalMinutes} * * * *`,
              () => {
                executeTask(task);
              }
            );
            cronJobs.set(task.id, job);
            console.log(`Scheduled interval task ${task.id}`);
          });
        }
      }
    });
  });
};
// New function to stop a task
export const stopTask = (taskId, reason = "unknown") => {
  // Stop immediate task
  const controller = immediateTaskControllers.get(taskId);
  if (controller) {
    controller.abort();
    immediateTaskControllers.delete(taskId);
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
// Store SSE clients
const sseClients = new Set();
// SSE endpoint for real-time task updates
app.get("/api/auto-action/tasks/sse", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // Ensure headers are sent immediately

  const client = { res };
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

// Broadcast task updates to all SSE clients
export const broadcastTaskUpdate = async () => {
  await tasksDb.read();
  const data = JSON.stringify(tasksDb.data);
  sseClients.forEach((client) => {
    client.res.write(`data: ${data}\n\n`);
  });
};

// Create a new task
app.post("/api/auto-action/tasks", async (req, res) => {
  try {
    const request = req.body;
    await tasksDb.read();

    const newTask = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: request.type,
      status: "idle",
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
    };

    tasksDb.data.push(newTask);
    await tasksDb.write();
    scheduleTasks(); // Reschedule tasks after adding a new one

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
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
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
    if (taskIndex === -1)
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });

    const currentTask = tasksDb.data[taskIndex];

    // Handle status transitions
    if (currentTask.status === "running" && status === "completed") {
      stopTask(currentTask.id, "status change to completed");
    } else if (
      currentTask.status === "paused" &&
      status === "running" &&
      currentTask.triggerType === "immediate"
    ) {
      // Resume immediate task by resetting controller and starting execution
      stopTask(currentTask.id, "clearing paused state"); // Clear any existing controller
      const controller = new AbortController();
      immediateTaskControllers.set(currentTask.id, controller);
      tasksDb.data[taskIndex].status = status;
      tasksDb.data[taskIndex].updatedAt = new Date().toISOString();
      await tasksDb.write();
      executeTask(tasksDb.data[taskIndex]); // Start execution immediately
    } else {
      // Update status for other cases
      tasksDb.data[taskIndex].status = status;
      tasksDb.data[taskIndex].updatedAt = new Date().toISOString();
      await tasksDb.write();
    }

    // Update the task status
    tasksDb.data[taskIndex].status = status;
    tasksDb.data[taskIndex].updatedAt = new Date().toISOString();
    await tasksDb.write();

    // Trigger scheduleTasks to handle any further cleanup or rescheduling
    await scheduleTasks();

    res.json({
      success: true,
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

// Delete a task
app.delete("/api/auto-action/tasks/:taskId", async (req, res) => {
  try {
    await tasksDb.read();
    const taskIndex = tasksDb.data.findIndex((t) => t.id === req.params.taskId);
    if (taskIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
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
        tasksDb.data[taskIndex].status = "completed";
      }
      await tasksDb.write();
    }

    return newLog;
  } catch (err) {
    console.error("Failed to add comment log:", err);
  }
};
// Playwright 配置和初始化
const initializePlaywright = async () => {
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
    await page.waitForFunction(() => typeof window._webmsxyw === "function");
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
    playwrightStatus = "running"; // 初始化完成后设置为运行中
    statusEmitter.emit("statusUpdate");
    localData = fs.readFileSync(localFilePath, "utf8");
    if (localData) {
      console.log(JSON.parse(localData).web_session, "3");

      xhs_client = new XhsClient({
        cookie: `a1=${A1};webId=${webId};web_session=${
          JSON.parse(localData).web_session
        }`,
        signFunc: sign,
      });
    }
  } catch (error) {
    playwrightStatus = "stopped";
    console.log("error");

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
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => typeof window._webmsxyw === "function", {
      timeout: 10000,
    });

    const encryptParams = await page.evaluate(
      ([url, data]) => {
        return window._webmsxyw(url, data);
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
app.get("/api/homefeed/recommend", async (req, res) => {
  try {
    const feedData = await xhs_client.get_home_feed(
      req.query.feed_type || FeedType.RECOMMEND
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
// 设置web-session
app.get("/api/get-web-session", (req, res) => {
  fs.readFile(sessionFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("读取文件失败", err);
      res.status(500).json({ error: "读取 web_session 失败" });
    } else {
      res.json({ web_session: data });
    }
  });
});
// server.js
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
    } = req.query;
    const result = await xhs_client.get_note_by_keyword(
      keyword,
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
    const { note_id, content } = req.body;
    if (!note_id || !content) {
      throw new Error("note_id 和 content 为必填参数");
    }
    const result = await xhs_client.comment_note(note_id, content);
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
      await initializePlaywright();
      // Call initialization on startup
      await initializeDatabases();
      await scheduleTasks();
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
