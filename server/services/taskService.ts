import { FeedType } from "../xhs/enums";
import {
  getRandomComment,
  getRandomDelay,
  getRandomKeyword,
  sleep,
} from "../xhs/help";
import { broadcastTaskUpdate, logsDb, tasksDb, cron, cronJobs } from "../main";
import { INote, ITask, TaskStatus, TriggerType } from "../type";
import { xhs_client } from "./playwrightServices";
// Map to store abort controllers for immediate tasks
export const immediateTaskControllers = new Map();
// Function to fetch all search notes
export const fetchSearchNotes = async (keyword, sortType, note_type = 0) => {
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
export const executeTask = async (task) => {
  if (task.status !== "running" || task.completedComments >= task.maxComments) {
    return;
  }
  const controller = immediateTaskControllers.get(task.id) as AbortController;
  let cronJob = cronJobs.get(task.id);

  let currentTask = tasksDb.data.find((t) => t.id === task.id)!;
  if (!currentTask || !cronJob) return;
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
      // Break if task is not immediate and cron job is stopped or not found
      if (
        task.triggerType !== TriggerType.Immediate &&
        !cronJobs.get(task.id)
      ) {
        break;
      }
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
          await xhs_client!.comment_note(note.id, comment);
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
export const deleteImmediateController = (id: any) => {
  immediateTaskControllers.delete(id);
};
export const addCommentLog = async (
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
export const scheduleTasks = async ({
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
      // Skip immediate tasks that are not set to run on startup
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
