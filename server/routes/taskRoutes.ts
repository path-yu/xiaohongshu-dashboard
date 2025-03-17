import express from "express";
import {
  executeTask,
  immediateTaskControllers,
  scheduleTasks,
  stopTask,
} from "../services/taskService";
import { ITask, TaskStatus } from "../type";
import { logsDb, tasksDb } from "../main";

const router = express.Router();

// Create a new task
router.post("/", async (req, res) => {
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
router.get("/", async (req, res) => {
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
router.get("/:taskId", async (req, res) => {
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
router.post("/:taskId/status", async (req, res) => {
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
    if (
      (currentTask.status === "running" && status === "completed") ||
      status === TaskStatus.Paused
    ) {
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
router.put("/:taskId", async (req, res) => {
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
    } as ITask;

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
      if (updatedTask.type === "immediate") {
        const controller = new AbortController();
        immediateTaskControllers.set(existingTask.id, controller);
        executeTask(updatedTask);
      } else {
        // Trigger scheduleTasks to handle any further cleanup or rescheduling
        scheduleTasks({ tasks: [updatedTask] }); // Reschedule tasks after adding a new one
      }
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
router.delete("/:taskId", async (req, res) => {
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
router.get("/:taskId/logs", async (req, res) => {
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

export default router;
