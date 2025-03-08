"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Slider,
  Grid,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Tooltip,
  RadioGroup,
  Radio,
  FormLabel,
  TablePagination,
  List,
  ListItem,
  ListItemText,
  Autocomplete,
} from "@mui/material";
import {
  Add as AddIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Home as HomeIcon,
  Schedule as ScheduleIcon,
  Loop as LoopIcon,
} from "@mui/icons-material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFnsV3";
import { format } from "date-fns";
import { useToast } from "../contexts/toast-context";
import { usePlaywright } from "../contexts/playwright.context";
import CommentModal from "../components/comment-modal";
import { useCommentStore } from "../store/comment-store";
import type { CommentTemplate } from "../types";
import {
  TaskType,
  TaskStatus,
  TriggerType,
  type CommentTask,
  type CommentLog,
  type CreateTaskRequest,
  createTask,
  getTasks,
  updateTaskStatus,
  deleteTask,
  getTaskLogs,
  exportLogsAsCsv,
  downloadCsv,
} from "../services/auto-action-service";
import { SearchSortType, SearchNoteType } from "../services/search-service";

// Tab panel component
function TabPanel(props: {
  children?: React.ReactNode;
  index: number;
  value: number;
}) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auto-action-tabpanel-${index}`}
      aria-labelledby={`auto-action-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AutoActionPage() {
  const [tabValue, setTabValue] = useState(0);
  const [tasks, setTasks] = useState<CommentTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<CommentTask | null>(null);
  const [taskLogs, setTaskLogs] = useState<CommentLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [templates, setTemplates] = useState<CommentTemplate[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { showToast } = useToast();
  const { status: playwrightStatus } = usePlaywright();
  const { isCommentModalOpen } = useCommentStore();

  // New task form state
  const [newTask, setNewTask] = useState<CreateTaskRequest>({
    type: TaskType.SEARCH,
    keywords: [], // Changed from keyword string to keywords array
    sortType: SearchSortType.LATEST,
    noteType: SearchNoteType.ALL,
    comments: [],
    useRandomComment: true,
    useRandomEmoji: true,
    minDelay: 30,
    maxDelay: 120,
    maxComments: 50,
    triggerType: TriggerType.IMMEDIATE,
  });
  const [customComment, setCustomComment] = useState("");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [scheduleDate, setScheduleDate] = useState<Date | null>(new Date());

  // Load tasks
  const fetchTasks = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getTasks();

      if (!response.success) {
        throw new Error(response.error || response.message);
      }

      setTasks(response.data);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError("Failed to load tasks. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    // Establish SSE connection
    const eventSource = new EventSource(
      "http://localhost:3000/api/auto-action/tasks/sse"
    );

    // Handle incoming messages (updated task list)
    eventSource.onmessage = (event) => {
      try {
        const updatedTasks = JSON.parse(event.data);
        setTasks(updatedTasks);
        setError(null); // Clear any previous errors
      } catch (err) {
        console.error("Failed to parse SSE data:", err);
        setError("Failed to parse task data");
      }
    };

    // Handle connection errors
    eventSource.onerror = () => {
      console.error("SSE connection error");
      setError("Lost connection to server. Retrying...");
      // EventSource automatically retries, so no need to reconnect manually
    };

    // Cleanup on component unmount
    return () => {
      eventSource.close();
      console.log("SSE connection closed");
    };
  }, []); // Empt
  // Initial load of tasks
  useEffect(() => {
    fetchTasks();
  }, []);

  // Load task logs when a task is selected
  useEffect(() => {
    const fetchTaskLogs = async () => {
      if (!selectedTask) return;

      setLogsLoading(true);
      try {
        const response = await getTaskLogs(selectedTask.id);

        if (!response.success) {
          throw new Error(response.error || response.message);
        }

        setTaskLogs(response.data);
      } catch (err) {
        console.error(`Error fetching logs for task ${selectedTask.id}:`, err);
        showToast("Failed to load task logs", "error");
      } finally {
        setLogsLoading(false);
      }
    };

    fetchTaskLogs();
  }, [selectedTask, showToast]);

  // Load templates
  useEffect(() => {
    const loadTemplates = () => {
      const savedTemplates = localStorage.getItem("comment_templates");
      if (savedTemplates) {
        try {
          setTemplates(JSON.parse(savedTemplates));
        } catch (e) {
          console.error("Failed to parse saved templates", e);
        }
      }
    };

    loadTemplates();
  }, []);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleTaskSelect = async (task: CommentTask) => {
    setSelectedTask(task);
    setTabValue(1); // Switch to task details tab
  };

  const handleRefreshTasks = () => {
    fetchTasks();
  };

  const handleRefreshTaskLogs = async () => {
    if (!selectedTask) return;

    setLogsLoading(true);
    try {
      const response = await getTaskLogs(selectedTask.id);

      if (!response.success) {
        throw new Error(response.error || response.message);
      }

      setTaskLogs(response.data);
      showToast("Task logs refreshed", "success");
    } catch (err) {
      console.error(`Error refreshing logs for task ${selectedTask.id}:`, err);
      showToast("Failed to refresh task logs", "error");
    } finally {
      setLogsLoading(false);
    }
  };

  const handleCreateTask = async () => {
    // Validate form
    if (
      newTask.type === TaskType.SEARCH &&
      (!newTask.keywords || newTask.keywords.length === 0)
    ) {
      showToast("请输入至少一个搜索关键词", "error");
      return;
    }

    if (customComment === "" && selectedTemplateIds.length === 0) {
      showToast("请添加至少一条评论或选择一个模板", "error");
      return;
    }

    // Process comments
    const comments: string[] = [];

    if (customComment) {
      comments.push(customComment);
    }

    // Add selected templates
    selectedTemplateIds.forEach((id) => {
      const template = templates.find((t) => t.id === id);
      if (template) {
        comments.push(template.content);
      }
    });

    // Process schedule time
    let scheduleTime: string | undefined;
    if (newTask.triggerType === TriggerType.SCHEDULED && scheduleDate) {
      scheduleTime = scheduleDate.toISOString();
    }

    // Create task object
    const taskToCreate: CreateTaskRequest = {
      ...newTask,
      comments,
      scheduleTime,
    };

    try {
      const response = await createTask(taskToCreate);

      if (!response.success) {
        throw new Error(response.error || response.message);
      }

      showToast("Task created successfully", "success");
      setCreateDialogOpen(false);

      // Reset form
      setNewTask({
        type: TaskType.SEARCH,
        keywords: [],
        sortType: SearchSortType.LATEST,
        noteType: SearchNoteType.ALL,
        comments: [],
        useRandomComment: true,
        useRandomEmoji: true,
        minDelay: 30,
        maxDelay: 120,
        maxComments: 50,
        triggerType: TriggerType.IMMEDIATE,
      });
      setCustomComment("");
      setSelectedTemplateIds([]);
      setScheduleDate(new Date());

      // Refresh tasks list
      fetchTasks();
    } catch (err) {
      console.error("Error creating task:", err);
      showToast("Failed to create task", "error");
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;

    try {
      const response = await deleteTask(taskToDelete);

      if (!response.success) {
        throw new Error(response.error || response.message);
      }

      if (selectedTask && selectedTask.id === taskToDelete) {
        setSelectedTask(null);
        setTaskLogs([]);
        setTabValue(0); // Switch back to tasks list tab
      }

      // Refresh tasks list
      fetchTasks();
      showToast("Task deleted successfully", "success");
    } catch (err) {
      console.error(`Error deleting task ${taskToDelete}:`, err);
      showToast("Failed to delete task", "error");
    } finally {
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  const handleUpdateTaskStatus = async (
    taskId: string,
    newStatus: TaskStatus
  ) => {
    try {
      const response = await updateTaskStatus(taskId, newStatus);

      if (!response.success) {
        throw new Error(response.error || response.message);
      }

      // Fetch the latest task data from the server
      await fetchTasks();

      // If this is the selected task, update it with the latest data from the fetched tasks
      if (selectedTask && selectedTask.id === taskId) {
        const updatedTask = tasks.find((task) => task.id === taskId);
        if (updatedTask) {
          setSelectedTask(updatedTask);
        }
      }

      const statusMessages = {
        [TaskStatus.RUNNING]: "Task started successfully",
        [TaskStatus.PAUSED]: "Task paused successfully",
        [TaskStatus.ERROR]: "Task encountered an error",
        [TaskStatus.COMPLETED]: "Task completed successfully",
        [TaskStatus.IDLE]: "Task reset to idle state",
      };

      showToast(
        statusMessages[newStatus],
        newStatus === TaskStatus.ERROR ? "error" : "success"
      );
    } catch (err) {
      console.error(`Error updating task ${taskId} status:`, err);
      showToast("Failed to update task status", "error");
    }
  };

  const handleExportLogs = () => {
    if (!selectedTask || taskLogs.length === 0) {
      showToast("No logs to export", "warning");
      return;
    }

    const csvContent = exportLogsAsCsv(taskLogs);
    const filename = `task-${selectedTask.id}-logs-${format(
      new Date(),
      "yyyy-MM-dd-HH-mm"
    )}.csv`;
    downloadCsv(csvContent, filename);
    showToast("Logs exported successfully", "success");
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(Number.parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleTemplateToggle = (templateId: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(templateId)
        ? prev.filter((id) => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleMinDelayChange = (_: Event, newValue: number | number[]) => {
    const minDelay = newValue as number;
    setNewTask((prev) => ({
      ...prev,
      minDelay,
      // Ensure max delay is always >= min delay
      maxDelay: prev.maxDelay < minDelay ? minDelay : prev.maxDelay,
    }));
  };

  const handleMaxDelayChange = (_: Event, newValue: number | number[]) => {
    setNewTask((prev) => ({
      ...prev,
      maxDelay: newValue as number,
    }));
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.RUNNING:
        return "success";
      case TaskStatus.PAUSED:
        return "warning";
      case TaskStatus.ERROR:
        return "error";
      case TaskStatus.COMPLETED:
        return "info";
      default:
        return "default";
    }
  };

  const getTaskTypeIcon = (type: TaskType) => {
    switch (type) {
      case TaskType.SEARCH:
        return <SearchIcon fontSize="small" />;
      case TaskType.HOMEPAGE:
        return <HomeIcon fontSize="small" />;
      default:
        return null;
    }
  };

  const getTriggerTypeIcon = (triggerType: TriggerType) => {
    switch (triggerType) {
      case TriggerType.IMMEDIATE:
        return <PlayIcon fontSize="small" />;
      case TriggerType.SCHEDULED:
        return <ScheduleIcon fontSize="small" />;
      case TriggerType.INTERVAL:
        return <LoopIcon fontSize="small" />;
      default:
        return null;
    }
  };

  const renderTaskControls = (task: CommentTask) => {
    switch (task.status) {
      case TaskStatus.RUNNING:
        return (
          <>
            <Tooltip title="Pause">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpdateTaskStatus(task.id, TaskStatus.PAUSED);
                }}
                color="warning"
              >
                <PauseIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Stop">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpdateTaskStatus(task.id, TaskStatus.COMPLETED);
                }}
                color="error"
              >
                <StopIcon />
              </IconButton>
            </Tooltip>
          </>
        );
      case TaskStatus.PAUSED:
        return (
          <>
            <Tooltip title="Resume">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpdateTaskStatus(task.id, TaskStatus.RUNNING);
                }}
                color="success"
              >
                <PlayIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Stop">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpdateTaskStatus(task.id, TaskStatus.COMPLETED);
                }}
                color="error"
              >
                <StopIcon />
              </IconButton>
            </Tooltip>
          </>
        );
      case TaskStatus.ERROR:
      case TaskStatus.COMPLETED:
      case TaskStatus.IDLE:
        return (
          <Tooltip title="Start">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleUpdateTaskStatus(task.id, TaskStatus.RUNNING);
              }}
              color="success"
            >
              <PlayIcon />
            </IconButton>
          </Tooltip>
        );
      default:
        return null;
    }
  };

  // Helper function to format keywords for display
  const formatKeywords = (keywords?: string[]) => {
    if (!keywords || keywords.length === 0) return "无关键词";
    return keywords.join(", ");
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h5">自动评论任务</Typography>
            <Box>
              {playwrightStatus !== "running" && (
                <Alert
                  severity="warning"
                  sx={{ mr: 2, display: "inline-flex" }}
                >
                  Playwright 未运行，无法执行自动任务
                </Alert>
              )}
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                disabled={playwrightStatus !== "running"}
              >
                创建新任务
              </Button>
            </Box>
          </Box>

          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label="任务列表" />
            {selectedTask && <Tab label="任务详情" />}
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRefreshTasks}
                disabled={loading}
              >
                刷新列表
              </Button>
            </Box>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            ) : tasks.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 5 }}>
                <Typography variant="h6">暂无任务</Typography>
                <Typography variant="body2" color="text.secondary">
                  点击"创建新任务"按钮开始
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>任务类型</TableCell>
                      <TableCell>关键词/来源</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell>进度</TableCell>
                      <TableCell>触发方式</TableCell>
                      <TableCell>创建时间</TableCell>
                      <TableCell>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow
                        key={task.id}
                        sx={{
                          cursor: "pointer",
                          "&:hover": { bgcolor: "action.hover" },
                          ...(selectedTask?.id === task.id
                            ? { bgcolor: "action.selected" }
                            : {}),
                        }}
                        onClick={() => handleTaskSelect(task)}
                      >
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            {getTaskTypeIcon(task.type)}
                            <Typography sx={{ ml: 1 }}>
                              {task.type === TaskType.SEARCH
                                ? "搜索评论"
                                : "首页评论"}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {task.type === TaskType.SEARCH ? (
                            <Tooltip title={formatKeywords(task.keywords)}>
                              <Typography noWrap sx={{ maxWidth: 200 }}>
                                {formatKeywords(task.keywords)}
                              </Typography>
                            </Tooltip>
                          ) : (
                            "首页推荐"
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={task.status}
                            color={getStatusColor(task.status)}
                            size="small"
                          />
                          {task.error && (
                            <Tooltip title={task.error}>
                              <InfoIcon
                                color="error"
                                fontSize="small"
                                sx={{ ml: 1 }}
                              />
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell>
                          {task.completedComments} / {task.maxComments}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            {getTriggerTypeIcon(task.triggerType)}
                            <Typography variant="body2" sx={{ ml: 1 }}>
                              {task.triggerType === TriggerType.IMMEDIATE
                                ? "立即执行"
                                : task.triggerType === TriggerType.SCHEDULED
                                ? `计划于 ${
                                    task.scheduleTime
                                      ? format(
                                          new Date(task.scheduleTime),
                                          "yyyy-MM-dd HH:mm"
                                        )
                                      : "N/A"
                                  }`
                                : `每 ${task.intervalMinutes} 分钟`}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {format(new Date(task.createdAt), "yyyy-MM-dd HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex" }}>
                            {renderTaskControls(task)}
                            <Tooltip title="删除">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(task.id);
                                }}
                                color="default"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {selectedTask ? (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Typography variant="h6">任务详情</Typography>
                      <Box>
                        {renderTaskControls(selectedTask)}
                        <Tooltip title="刷新">
                          <IconButton size="small" onClick={handleRefreshTasks}>
                            <RefreshIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">任务ID</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedTask.id}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">任务类型</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedTask.type === TaskType.SEARCH
                            ? "搜索评论"
                            : "首页评论"}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">状态</Typography>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Chip
                            label={selectedTask.status}
                            color={getStatusColor(selectedTask.status)}
                            size="small"
                          />
                          {selectedTask.error && (
                            <Tooltip title={selectedTask.error}>
                              <InfoIcon
                                color="error"
                                fontSize="small"
                                sx={{ ml: 1 }}
                              />
                            </Tooltip>
                          )}
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">进度</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedTask.completedComments} /{" "}
                          {selectedTask.maxComments}
                        </Typography>
                      </Grid>
                      {selectedTask.type === TaskType.SEARCH && (
                        <>
                          <Grid item xs={12}>
                            <Typography variant="subtitle2">
                              搜索关键词
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              {selectedTask.keywords &&
                              selectedTask.keywords.length > 0 ? (
                                selectedTask.keywords.map((keyword, index) => (
                                  <Chip
                                    key={index}
                                    label={keyword}
                                    size="small"
                                    sx={{ mr: 1, mb: 1 }}
                                  />
                                ))
                              ) : (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  无关键词
                                </Typography>
                              )}
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="subtitle2">
                              排序方式
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {selectedTask.sortType === SearchSortType.GENERAL
                                ? "综合排序"
                                : selectedTask.sortType ===
                                  SearchSortType.LATEST
                                ? "最新排序"
                                : "最热排序"}
                            </Typography>
                          </Grid>
                        </>
                      )}
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">触发方式</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedTask.triggerType === TriggerType.IMMEDIATE
                            ? "立即执行"
                            : selectedTask.triggerType === TriggerType.SCHEDULED
                            ? `计划于 ${
                                selectedTask.scheduleTime
                                  ? format(
                                      new Date(selectedTask.scheduleTime),
                                      "yyyy-MM-dd HH:mm"
                                    )
                                  : "N/A"
                              }`
                            : `每 ${selectedTask.intervalMinutes} 分钟`}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">延迟设置</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedTask.minDelay} - {selectedTask.maxDelay} 秒
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2">评论内容</Typography>
                        <List
                          dense
                          sx={{
                            bgcolor: "background.default",
                            borderRadius: 1,
                            mt: 1,
                          }}
                        >
                          {selectedTask.comments.map((comment, index) => (
                            <ListItem key={index}>
                              <ListItemText primary={comment} />
                            </ListItem>
                          ))}
                        </List>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">随机评论</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedTask.useRandomComment ? "是" : "否"}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">随机表情</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedTask.useRandomEmoji ? "是" : "否"}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">创建时间</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {format(
                            new Date(selectedTask.createdAt),
                            "yyyy-MM-dd HH:mm"
                          )}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">更新时间</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {format(
                            new Date(selectedTask.updatedAt),
                            "yyyy-MM-dd HH:mm"
                          )}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Typography variant="h6">错误日志</Typography>
                      <Box>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<DownloadIcon />}
                          onClick={handleExportLogs}
                          disabled={taskLogs.length === 0}
                          sx={{ mr: 1 }}
                        >
                          导出CSV
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<RefreshIcon />}
                          onClick={handleRefreshTaskLogs}
                          disabled={logsLoading}
                        >
                          刷新
                        </Button>
                      </Box>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    {logsLoading ? (
                      <Box
                        sx={{ display: "flex", justifyContent: "center", p: 3 }}
                      >
                        <CircularProgress />
                      </Box>
                    ) : taskLogs.length === 0 ? (
                      <Box sx={{ textAlign: "center", py: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                          暂无错误日志
                        </Typography>
                      </Box>
                    ) : (
                      <>
                        <TableContainer sx={{ maxHeight: 400 }}>
                          <Table stickyHeader size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>时间</TableCell>
                                <TableCell>笔记标题</TableCell>
                                <TableCell>评论内容</TableCell>
                                <TableCell>状态</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {taskLogs
                                .slice(
                                  page * rowsPerPage,
                                  page * rowsPerPage + rowsPerPage
                                )
                                .map((log) => (
                                  <TableRow key={log.id}>
                                    <TableCell>
                                      {format(
                                        new Date(log.timestamp),
                                        "MM-dd HH:mm:ss"
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Tooltip title={log.noteTitle}>
                                        <Typography
                                          variant="body2"
                                          noWrap
                                          sx={{ maxWidth: 150 }}
                                        >
                                          {log.noteTitle}
                                        </Typography>
                                      </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                      <Tooltip title={log.comment}>
                                        <Typography
                                          variant="body2"
                                          noWrap
                                          sx={{ maxWidth: 150 }}
                                        >
                                          {log.comment}
                                        </Typography>
                                      </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                      <Chip
                                        label={log.success ? "成功" : "失败"}
                                        color={
                                          log.success ? "success" : "error"
                                        }
                                        size="small"
                                      />
                                      {!log.success && log.error && (
                                        <Tooltip title={log.error}>
                                          <InfoIcon
                                            color="error"
                                            fontSize="small"
                                            sx={{ ml: 1 }}
                                          />
                                        </Tooltip>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                        <TablePagination
                          component="div"
                          count={taskLogs.length}
                          page={page}
                          onPageChange={handleChangePage}
                          rowsPerPage={rowsPerPage}
                          onRowsPerPageChange={handleChangeRowsPerPage}
                          rowsPerPageOptions={[5, 10, 25, 50]}
                        />
                      </>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            ) : (
              <Box sx={{ textAlign: "center", py: 5 }}>
                <Typography variant="h6">请选择一个任务查看详情</Typography>
              </Box>
            )}
          </TabPanel>
        </CardContent>
      </Card>

      {/* Create Task Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>创建自动评论任务</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">任务类型</FormLabel>
                <RadioGroup
                  row
                  value={newTask.type}
                  onChange={(e) =>
                    setNewTask({ ...newTask, type: e.target.value as TaskType })
                  }
                >
                  <FormControlLabel
                    value={TaskType.SEARCH}
                    control={<Radio />}
                    label="搜索评论"
                  />
                  <FormControlLabel
                    value={TaskType.HOMEPAGE}
                    control={<Radio />}
                    label="首页评论"
                  />
                </RadioGroup>
              </FormControl>
            </Grid>

            {newTask.type === TaskType.SEARCH && (
              <>
                <Grid item xs={12}>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={[]}
                    value={newTask.keywords || []}
                    onChange={(_, newValue) => {
                      setNewTask({ ...newTask, keywords: newValue });
                    }}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          variant="outlined"
                          label={option}
                          {...getTagProps({ index })}
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="搜索关键词"
                        placeholder="输入关键词后按回车添加多个"
                        helperText="可添加多个关键词，随机选择关键词搜索笔记数据"
                        fullWidth
                        required
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>排序方式</InputLabel>
                    <Select
                      value={newTask.sortType}
                      label="排序方式"
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          sortType: e.target.value as SearchSortType,
                        })
                      }
                    >
                      <MenuItem value={SearchSortType.GENERAL}>
                        综合排序
                      </MenuItem>
                      <MenuItem value={SearchSortType.LATEST}>
                        最新排序
                      </MenuItem>
                      <MenuItem value={SearchSortType.HOT}>最热排序</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>笔记类型</InputLabel>
                    <Select
                      value={newTask.noteType}
                      label="笔记类型"
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          noteType: e.target.value as SearchNoteType,
                        })
                      }
                    >
                      <MenuItem value={SearchNoteType.ALL}>所有笔记</MenuItem>
                      <MenuItem value={SearchNoteType.VIDEO}>视频笔记</MenuItem>
                      <MenuItem value={SearchNoteType.IMAGE}>图文笔记</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Divider textAlign="left">评论设置</Divider>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="自定义评论"
                placeholder="输入自定义评论内容..."
                value={customComment}
                onChange={(e) => setCustomComment(e.target.value)}
                helperText="可以添加自定义评论，也可以选择下方的评论模板"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                评论模板
              </Typography>
              <Paper
                variant="outlined"
                sx={{ p: 2, maxHeight: 200, overflow: "auto" }}
              >
                {templates.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    没有可用的模板。请在模板页面创建模板。
                  </Typography>
                ) : (
                  <Grid container spacing={1}>
                    {templates.map((template) => (
                      <Grid item xs={12} key={template.id}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedTemplateIds.includes(
                                template.id
                              )}
                              onChange={() => handleTemplateToggle(template.id)}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {template.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {template.content}
                              </Typography>
                            </Box>
                          }
                        />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newTask.useRandomComment}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        useRandomComment: e.target.checked,
                      })
                    }
                  />
                }
                label="随机选择评论"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newTask.useRandomEmoji}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        useRandomEmoji: e.target.checked,
                      })
                    }
                  />
                }
                label="随机插入表情"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider textAlign="left">执行设置</Divider>
            </Grid>

            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">触发方式</FormLabel>
                <RadioGroup
                  row
                  value={newTask.triggerType}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      triggerType: e.target.value as TriggerType,
                    })
                  }
                >
                  <FormControlLabel
                    value={TriggerType.IMMEDIATE}
                    control={<Radio />}
                    label="立即执行"
                  />
                  <FormControlLabel
                    value={TriggerType.SCHEDULED}
                    control={<Radio />}
                    label="计划执行"
                  />
                  <FormControlLabel
                    value={TriggerType.INTERVAL}
                    control={<Radio />}
                    label="定时执行"
                  />
                </RadioGroup>
              </FormControl>
            </Grid>

            {newTask.triggerType === TriggerType.SCHEDULED && (
              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateTimePicker
                    label="计划执行时间"
                    value={scheduleDate}
                    onChange={(newValue) => setScheduleDate(newValue)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
            )}

            {newTask.triggerType === TriggerType.INTERVAL && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="执行间隔（分钟）"
                  value={newTask.intervalMinutes || 60}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      intervalMinutes: Number.parseInt(e.target.value),
                    })
                  }
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Grid>
            )}

            <Grid item xs={12} md={6}>
              <Typography gutterBottom>
                最小延迟: {newTask.minDelay} 秒
              </Typography>
              <Slider
                value={newTask.minDelay}
                onChange={handleMinDelayChange}
                min={1}
                max={300}
                valueLabelDisplay="auto"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography gutterBottom>
                最大延迟: {newTask.maxDelay} 秒
              </Typography>
              <Slider
                value={newTask.maxDelay}
                onChange={handleMaxDelayChange}
                min={newTask.minDelay}
                max={600}
                valueLabelDisplay="auto"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="最大评论数"
                value={newTask.maxComments}
                onChange={(e) =>
                  setNewTask({
                    ...newTask,
                    maxComments: Number.parseInt(e.target.value),
                  })
                }
                InputProps={{ inputProps: { min: 1 } }}
                helperText="任务将在达到此评论数后自动停止"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            onClick={handleCreateTask}
            variant="contained"
            color="primary"
            disabled={
              (newTask.type === TaskType.SEARCH &&
                (!newTask.keywords || newTask.keywords.length === 0)) ||
              (customComment === "" && selectedTemplateIds.length === 0)
            }
          >
            创建任务
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>删除任务</DialogTitle>
        <DialogContent>
          <Typography>确定要删除此任务吗？此操作无法撤销。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
          <Button onClick={confirmDeleteTask} color="error">
            删除
          </Button>
        </DialogActions>
      </Dialog>

      {isCommentModalOpen && <CommentModal />}
    </Box>
  );
}
