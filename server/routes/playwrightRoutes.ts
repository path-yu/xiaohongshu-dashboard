import express from "express";
import {
  initializePlaywright,
  stopPlaywright,
  playwrightStatus,
  statusEmitter,
  browser,
  changeStatus,
} from "../services/playwrightServices";

const router = express.Router();

// 路由：控制 Playwright 启动和停止
router.post("/control", async (req, res) => {
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

// SSE 路由
router.get("/playwright/status", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Function to send status
  const sendStatus = async () => {
    try {
      let statusMessage;
      switch (playwrightStatus) {
        case "loading":
          statusMessage = "Playwright is loading";
          break;
        case "running":
          statusMessage = "Playwright is running";
          break;
        case "stopped":
          statusMessage = "Playwright has stopped";
          break;
        default:
          statusMessage = "Unknown status";
      }

      if (
        playwrightStatus === "running" &&
        (!browser || (await browser.contexts()).length === 0)
      ) {
        changeStatus("stopped");
        statusMessage = "Playwright has stopped (unexpected issue detected)";
      }

      const data = {
        status: playwrightStatus,
        message: statusMessage,
        timestamp: new Date().toISOString(),
      };
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      const errorData = {
        error: "Failed to retrieve Playwright status",
        message: error.message,
      };
      res.write(`data: ${JSON.stringify(errorData)}\n\n`);
    }
  };

  // Send current status on initial connection
  sendStatus();

  // Listen for status update events
  const statusListener = () => sendStatus();
  statusEmitter.on("statusUpdate", statusListener);

  // Cleanup connection
  req.on("close", () => {
    statusEmitter.off("statusUpdate", statusListener);
    res.end();
  });
});

export default router;
