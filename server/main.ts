import express, { Response } from "express";
import path from "path";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node"; // Use JSONFile adapter for Node.js
import cors from "cors"; // 引入 CORS 中间件
import cron from "node-cron";
import fs from "fs";

import { ITask, ILog } from "./type.ts";

// Import routes
import taskRoutes from "./routes/taskRoutes";
import playwrightRoutes from "./routes/playwrightRoutes";
import signRoutes from "./routes/signRoutes";
import sessionRoutes from "./routes/sessionRoutes";
import feedRoutes from "./routes/feedRoutes";
import { initializePlaywright } from "./services/playwrightServices.ts";

const app = express();
const port = 3000;
export let localFilePath = path.join(process.cwd(), "local.json");

// File paths for storing tasks and logs
const TASKS_FILE = path.join(process.cwd(), "tasks.json");
const LOGS_FILE = path.join(process.cwd(), "logs.json");
// / Initialize LowDB instances
// 初始化 tasksDb
const tasksAdapter = new JSONFile<ITask[]>(TASKS_FILE);
export const tasksDb = new Low<ITask[]>(tasksAdapter, []);

// 初始化 logsDb
const logsAdapter = new JSONFile<ILog[]>(LOGS_FILE);
export const logsDb = new Low<ILog[]>(logsAdapter, []);
// Map to store cron jobs for interval tasks
export const cronJobs = new Map<string, cron.ScheduledTask>();

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

// 定义 SSE 客户端接口
interface SSEClient {
  id: string; // 唯一标识符
  res: Response; // Express 的 Response 对象
}
// Function to add a comment log
// 允许所有来源的请求
app.use(cors());
// 中间件以解析 JSON 请求体
app.use(express.json());
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

// Use routes
app.use("/api/auto-action/tasks", taskRoutes);
app.use("/api", playwrightRoutes);
app.use("/sign", signRoutes);
app.use("/api", sessionRoutes);
app.use("/api", feedRoutes);

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
app.listen(port, async () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(process.platform);
  const localData = fs.readFileSync(localFilePath, "utf8");
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
export { cron };
