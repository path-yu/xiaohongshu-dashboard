import type React from "react";
import { useState, useEffect, useCallback } from "react";
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
  Edit as EditIcon,
} from "@mui/icons-material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFnsV3";
import { format } from "date-fns";
import { useToast } from "../contexts/toast-context";
import { usePlaywright } from "../contexts/playwright-context";
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
  type UpdateTaskRequest,
  createTask,
  updateTask,
  getTasks,
  updateTaskStatus,
  deleteTask,
  getTaskLogs,
  exportLogsAsCsv,
  downloadCsv,
  subscribeToTaskUpdates,
} from "../services/auto-action-service";
import { SearchSortType, SearchNoteType } from "../services/search-service";
import { useLanguage } from "../contexts/language-context";

// Tab panel component
function TabPanel(props: {
  children?: React.ReactNode;
  value: number;
  index: number;
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
  const { translations } = useLanguage();
  const [tasks, setTasks] = useState<CommentTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<CommentTask | null>(null);
  const [taskLogs, setTaskLogs] = useState<CommentLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [templates, setTemplates] = useState<CommentTemplate[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [taskNotification, setTaskNotification] = useState<{
    show: boolean;
    message: string;
    taskId?: string;
  }>({ show: false, message: "" });
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
    executeOnStartup: false, // 服务开机是否立即执行
    rescheduleAfterUpdate: true, // 修改任务参数后是否立即重新调度
  });

  // Edit task form state
  const [editTask, setEditTask] = useState<UpdateTaskRequest>({
    id: "",
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
    executeOnStartup: false, // 服务开机是否立即执行
    rescheduleAfterUpdate: true, // 修改任务参数后是否立即重新调度
  });

  const [customComment, setCustomComment] = useState("");
  const [editCustomComment, setEditCustomComment] = useState("");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [editSelectedTemplateIds, setEditSelectedTemplateIds] = useState<
    string[]
  >([]);
  const [scheduleDate, setScheduleDate] = useState<Date | null>(new Date());
  const [editScheduleDate, setEditScheduleDate] = useState<Date | null>(
    new Date()
  );

  // Function to handle SSE task updates
  const handleTaskUpdate = useCallback(
    (updatedTasks: CommentTask[]) => {
      setTasks(updatedTasks);

      // Update selected task if it exists in the updated tasks
      if (selectedTask) {
        const updatedSelectedTask = updatedTasks.find(
          (task) => task.id === selectedTask.id
        );
        if (updatedSelectedTask) {
          // Check if the task has changed status
          if (updatedSelectedTask.status !== selectedTask.status) {
            setTaskNotification({
              show: true,
              message: (translations.taskStatusUpdated as Function)(
                updatedSelectedTask.id,
                updatedSelectedTask.status
              ),
              taskId: updatedSelectedTask.id,
            });

            // Auto-hide notification after 5 seconds
            setTimeout(() => {
              setTaskNotification((prev) =>
                prev.taskId === updatedSelectedTask.id
                  ? { show: false, message: "" }
                  : prev
              );
            }, 5000);
          }

          setSelectedTask(updatedSelectedTask);
        }
      }
    },
    [selectedTask]
  );
  // Connect to SSE for real-time updates
  useEffect(() => {
    const cleanup = subscribeToTaskUpdates(handleTaskUpdate);
    // Clean up SSE connection on unmount
    return cleanup;
  }, []);

  // Load tasks on first load (backup if SSE fails)
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
      setError(translations.failedToLoadTasks as string);
    } finally {
      setLoading(false);
    }
  };

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
        showToast(translations.failedToLoadTaskLogs as string, "error");
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
      showToast(translations.taskLogsRefreshed as string, "success");
    } catch (err) {
      console.error(`Error refreshing logs for task ${selectedTask.id}:`, err);
      showToast(translations.failedToRefreshTaskLogs as string, "error");
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
      showToast(translations.enterAtLeastOneKeyword as string, "error");
      return;
    }

    if (customComment === "" && selectedTemplateIds.length === 0) {
      showToast(translations.addAtLeastOneCommentOrTemplate as string, "error");
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

      showToast(translations.taskCreatedSuccessfully as string, "success");
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
        executeOnStartup: false,
        rescheduleAfterUpdate: true,
      });
      setCustomComment("");
      setSelectedTemplateIds([]);
      setScheduleDate(new Date());
      fetchTasks();
    } catch (err) {
      console.error("Error creating task:", err);
      showToast(translations.failedToCreateTask as string, "error");
    }
  };

  const handleEditTask = (task: CommentTask) => {
    // 设置编辑表单的初始值
    setEditTask({
      id: task.id,
      type: task.type,
      keywords: task.keywords || [],
      sortType: task.sortType || SearchSortType.LATEST,
      noteType: task.noteType || SearchNoteType.ALL,
      comments: task.comments,
      useRandomComment: task.useRandomComment,
      useRandomEmoji: task.useRandomEmoji,
      minDelay: task.minDelay,
      maxDelay: task.maxDelay,
      maxComments: task.maxComments,
      triggerType: task.triggerType,
      scheduleTime: task.scheduleTime,
      intervalMinutes: task.intervalMinutes,
      executeOnStartup: task.executeOnStartup || false,
      rescheduleAfterUpdate:
        task.rescheduleAfterUpdate !== undefined
          ? task.rescheduleAfterUpdate
          : true,
    });

    // 设置自定义评论和模板
    setEditCustomComment("");
    const templateIds: string[] = [];

    // 尝试匹配评论内容与模板
    task.comments.forEach((comment) => {
      const matchedTemplate = templates.find((t) => t.content === comment);
      if (matchedTemplate) {
        templateIds.push(matchedTemplate.id);
      } else {
        // 如果没有匹配的模板，则认为是自定义评论
        setEditCustomComment(comment);
      }
    });

    setEditSelectedTemplateIds(templateIds);

    // 设置计划时间
    if (task.scheduleTime) {
      setEditScheduleDate(new Date(task.scheduleTime));
    } else {
      setEditScheduleDate(new Date());
    }

    // 打开编辑对话框
    setEditDialogOpen(true);
  };

  const handleUpdateTask = async () => {
    // 验证表单
    if (
      editTask.type === TaskType.SEARCH &&
      (!editTask.keywords || editTask.keywords.length === 0)
    ) {
      showToast(translations.enterAtLeastOneKeyword as string, "error");
      return;
    }

    if (editCustomComment === "" && editSelectedTemplateIds.length === 0) {
      showToast(translations.addAtLeastOneCommentOrTemplate as string, "error");
      return;
    }

    // 处理评论
    const comments: string[] = [];

    if (editCustomComment) {
      comments.push(editCustomComment);
    }

    // 添加选中的模板
    editSelectedTemplateIds.forEach((id) => {
      const template = templates.find((t) => t.id === id);
      if (template) {
        comments.push(template.content);
      }
    });

    // 处理计划时间
    let scheduleTime: string | undefined;
    if (editTask.triggerType === TriggerType.SCHEDULED && editScheduleDate) {
      scheduleTime = editScheduleDate.toISOString();
    }

    // 创建更新任务对象
    const taskToUpdate: UpdateTaskRequest = {
      ...editTask,
      comments,
      scheduleTime,
    };

    try {
      const response = await updateTask(taskToUpdate);

      if (!response.success) {
        throw new Error(response.error || response.message);
      }

      showToast(translations.taskUpdatedSuccessfully as string, "success");
      setEditDialogOpen(false);
      await fetchTasks();
      // 如果当前选中的任务是被编辑的任务，更新选中的任务
      if (
        selectedTask &&
        selectedTask.id === taskToUpdate.id &&
        response.data
      ) {
        setSelectedTask(response.data);
      }
    } catch (err) {
      console.error(`Error updating task ${taskToUpdate.id}:`, err);
      showToast(translations.failedToUpdateTask as string, "error");
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

      fetchTasks();

      showToast(translations.taskDeletedSuccessfully as string, "success");
    } catch (err) {
      console.error(`Error deleting task ${taskToDelete}:`, err);
      showToast(translations.failedToDeleteTask as string, "error");
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
      await fetchTasks();

      // If this is the selected task, update it with the latest data from the fetched tasks
      if (selectedTask && selectedTask.id === taskId) {
        const updatedTask = tasks.find((task) => task.id === taskId);
        if (updatedTask) {
          setSelectedTask(updatedTask);
        }
      }

      const statusMessages = {
        [TaskStatus.RUNNING]: translations.taskStartedSuccessfully as string,
        [TaskStatus.PAUSED]: translations.taskEncounteredAnError as string,
        [TaskStatus.ERROR]: translations.taskStoppedSuccessfully as string,
        [TaskStatus.COMPLETED]:
          translations.taskCompletedSuccessfully as string,
        [TaskStatus.IDLE]: translations.taskResetToIdleState as string,
      };

      showToast(
        statusMessages[newStatus],
        newStatus === TaskStatus.ERROR ? "error" : "success"
      );
    } catch (err) {
      console.error(`Error updating task ${taskId} status:`, err);
      showToast(translations.failedToUpdateTaskStatus as string, "error");
    }
  };

  const handleExportLogs = () => {
    if (!selectedTask || taskLogs.length === 0) {
      showToast(translations.noLogsToExport as string, "warning");
      return;
    }

    const csvContent = exportLogsAsCsv(taskLogs);
    const filename = `task-${selectedTask.id}-logs-${format(
      new Date(),
      "yyyy-MM-dd-HH-mm"
    )}.csv`;
    downloadCsv(csvContent, filename);
    showToast(translations.logsExportedSuccessfully as string, "success");
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

  const handleEditTemplateToggle = (templateId: string) => {
    setEditSelectedTemplateIds((prev) =>
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

  const handleEditMinDelayChange = (_: Event, newValue: number | number[]) => {
    const minDelay = newValue as number;
    setEditTask((prev) => ({
      ...prev,
      minDelay,
      // Ensure max delay is always >= min delay
      maxDelay: prev.maxDelay < minDelay ? minDelay : prev.maxDelay,
    }));
  };

  const handleEditMaxDelayChange = (_: Event, newValue: number | number[]) => {
    setEditTask((prev) => ({
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
    return (
      <Box sx={{ display: "flex" }}>
        {/* 编辑按钮 */}
        <Tooltip title={translations.edit as string}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleEditTask(task);
            }}
            color="primary"
          >
            <EditIcon />
          </IconButton>
        </Tooltip>

        {/* 状态控制按钮 */}
        {task.status === TaskStatus.RUNNING && (
          <>
            <Tooltip title={translations.pause as string}>
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
            <Tooltip title={translations.stop as string}>
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
        )}

        {task.status === TaskStatus.PAUSED && (
          <>
            <Tooltip title={translations.continue as string}>
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
            <Tooltip title={translations.stop as string}>
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
        )}

        {(task.status === TaskStatus.ERROR ||
          task.status === TaskStatus.COMPLETED ||
          task.status === TaskStatus.IDLE) && (
          <Tooltip title={translations.start as string}>
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
        )}

        {/* 删除按钮 */}
        <Tooltip title={translations.delete as string}>
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
    );
  };

  // Helper function to format keywords for display
  const formatKeywords = (keywords?: string[]) => {
    if (!keywords || keywords.length === 0)
      return translations.noKeywords as string;
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
            <Typography variant="h5">
              {translations.autoCommentTasks as string}
            </Typography>
            <Box>
              {playwrightStatus !== "running" && (
                <Alert
                  severity="warning"
                  sx={{ mr: 2, display: "inline-flex" }}
                >
                  {
                    translations.playwrightNotRunningCannotExecuteAutoTask as string
                  }
                </Alert>
              )}
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                disabled={playwrightStatus !== "running"}
              >
                {translations.createTask as string}
              </Button>
            </Box>
          </Box>

          {taskNotification.show && (
            <Alert
              severity="info"
              sx={{ mb: 2 }}
              onClose={() => setTaskNotification({ show: false, message: "" })}
            >
              {taskNotification.message}
            </Alert>
          )}

          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label={translations.taskList as string} />
            {selectedTask && <Tab label={translations.taskDetails as string} />}
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRefreshTasks}
                disabled={loading}
              >
                {translations.refreshList as string}
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
                <Typography variant="h6">
                  {translations.noTasks as string}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {translations.clickCreateNewTaskButton as string}
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>{translations.taskType as string}</TableCell>
                      <TableCell>
                        {translations.keywordsOrSource as string}
                      </TableCell>
                      <TableCell>{translations.status as string}</TableCell>
                      <TableCell>{translations.progress as string}</TableCell>
                      <TableCell>
                        {translations.triggerType as string}
                      </TableCell>
                      <TableCell>
                        {translations.executeOnStartup as string}
                      </TableCell>
                      <TableCell>
                        {translations.rescheduleAfterUpdate as string}
                      </TableCell>
                      <TableCell>
                        {translations.creationTime as string}
                      </TableCell>
                      <TableCell>{translations.actions as string}</TableCell>
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
                                ? (translations.searchComment as string)
                                : (translations.homepageComment as string)}
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
                            (translations.homepageRecommendation as string)
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
                                ? (translations.executeImmediately as string)
                                : task.triggerType === TriggerType.SCHEDULED
                                ? `${translations.scheduledAt} ${
                                    task.scheduleTime
                                      ? format(
                                          new Date(task.scheduleTime),
                                          "yyyy-MM-dd HH:mm"
                                        )
                                      : "N/A"
                                  }`
                                : `${translations.every} ${task.intervalMinutes} ${translations.minutes}`}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {task.executeOnStartup ? (
                            <Chip
                              label={translations.yes as string}
                              color="success"
                              size="small"
                            />
                          ) : (
                            <Chip
                              label={translations.no as string}
                              color="default"
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {task.rescheduleAfterUpdate !== false ? (
                            <Chip
                              label={translations.yes as string}
                              color="success"
                              size="small"
                            />
                          ) : (
                            <Chip
                              label={translations.no as string}
                              color="default"
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(task.createdAt), "yyyy-MM-dd HH:mm")}
                        </TableCell>
                        <TableCell>{renderTaskControls(task)}</TableCell>
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
                      <Typography variant="h6">
                        {translations.taskDetails as string}
                      </Typography>
                      <Box>{renderTaskControls(selectedTask)}</Box>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">
                          {translations.taskId as string}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedTask.id}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">
                          {translations.taskType as string}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedTask.type === TaskType.SEARCH
                            ? (translations.searchComment as string)
                            : (translations.homepageComment as string)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">
                          {translations.status as string}
                        </Typography>
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
                        <Typography variant="subtitle2">
                          {translations.progress as string}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedTask.completedComments} /{" "}
                          {selectedTask.maxComments}
                        </Typography>
                      </Grid>
                      {selectedTask.type === TaskType.SEARCH && (
                        <>
                          <Grid item xs={12}>
                            <Typography variant="subtitle2">
                              {translations.searchKeywords as string}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              {selectedTask.keywords &&
                              selectedTask.keywords.length > 0 ? (
                                selectedTask.keywords.map((keyword) => (
                                  <Chip
                                    key={keyword}
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
                                  {translations.noKeywords as string}
                                </Typography>
                              )}
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="subtitle2">
                              {translations.sortType as string}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {selectedTask.sortType === SearchSortType.GENERAL
                                ? (translations.generalSort as string)
                                : selectedTask.sortType ===
                                  SearchSortType.LATEST
                                ? (translations.latestSort as string)
                                : (translations.hotSort as string)}
                            </Typography>
                          </Grid>
                        </>
                      )}
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">
                          {translations.triggerType as string}{" "}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedTask.triggerType === TriggerType.IMMEDIATE
                            ? (translations.executeImmediately as string)
                            : selectedTask.triggerType === TriggerType.SCHEDULED
                            ? `${translations.scheduledAt as string} ${
                                selectedTask.scheduleTime
                                  ? format(
                                      new Date(selectedTask.scheduleTime),
                                      "yyyy-MM-dd HH:mm"
                                    )
                                  : "N/A"
                              }`
                            : `${translations.every as string} ${
                                selectedTask.intervalMinutes
                              } ${translations.minutes as string}`}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">
                          {translations.delaySettings as string}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedTask.minDelay} - {selectedTask.maxDelay} 秒
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">
                          {translations.executeOnStartup as string}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedTask.executeOnStartup
                            ? (translations.yes as string)
                            : (translations.no as string)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">
                          {translations.rescheduleAfterUpdate as string}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedTask.rescheduleAfterUpdate !== false
                            ? (translations.yes as string)
                            : (translations.no as string)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2">
                          {translations.commentContent as string}
                        </Typography>
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
                        <Typography variant="subtitle2">
                          {translations.useRandomComment as string}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedTask.useRandomComment
                            ? (translations.yes as string)
                            : (translations.no as string)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">
                          {" "}
                          {translations.useRandomEmoji as string}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedTask.useRandomEmoji
                            ? (translations.yes as string)
                            : (translations.no as string)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">
                          {translations.creationTime as string}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {format(
                            new Date(selectedTask.createdAt),
                            "yyyy-MM-dd HH:mm"
                          )}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">
                          {translations.updateTime as string}
                        </Typography>
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
                      <Typography variant="h6">
                        {translations.commentLogs as string}
                      </Typography>
                      <Box>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<DownloadIcon />}
                          onClick={handleExportLogs}
                          disabled={taskLogs.length === 0}
                          sx={{ mr: 1 }}
                        >
                          {translations.exportCSV as string}
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<RefreshIcon />}
                          onClick={handleRefreshTaskLogs}
                          disabled={logsLoading}
                        >
                          {translations.refresh as string}
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
                          {translations.noCommentLogs as string}
                        </Typography>
                      </Box>
                    ) : (
                      <>
                        <TableContainer sx={{ maxHeight: 400 }}>
                          <Table stickyHeader size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>
                                  {translations.time as string}
                                </TableCell>
                                <TableCell>
                                  {translations.noteTitle as string}
                                </TableCell>
                                <TableCell>
                                  {translations.commentContent as string}
                                </TableCell>
                                <TableCell>
                                  {" "}
                                  {translations.status as string}
                                </TableCell>
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
                                        label={
                                          log.success
                                            ? (translations.success as string)
                                            : (translations.failure as string)
                                        }
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
                <Typography variant="h6">
                  {translations.pleaseSelectTaskToViewDetails as string}
                </Typography>
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
        <DialogTitle> {translations.createNewTask as string}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">
                  {translations.taskType as string}
                </FormLabel>
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
                    label={translations.searchComment as string}
                  />
                  <FormControlLabel
                    value={TaskType.HOMEPAGE}
                    control={<Radio />}
                    label={translations.homepageComment as string}
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
                        label={translations.searchKeywords as string}
                        placeholder={
                          translations.enterKeywordsAndPressEnterToAddMultiple as string
                        }
                        helperText={
                          translations.canAddMultipleKeywordsEachCreatesSeparateTask as string
                        }
                        fullWidth
                        required
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>{translations.sortType as string}</InputLabel>
                    <Select
                      value={newTask.sortType}
                      label={translations.sortType as string}
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          sortType: e.target.value as SearchSortType,
                        })
                      }
                    >
                      <MenuItem value={SearchSortType.GENERAL}>
                        {translations.generalSort as string}
                      </MenuItem>
                      <MenuItem value={SearchSortType.LATEST}>
                        {translations.latestSort as string}
                      </MenuItem>
                      <MenuItem value={SearchSortType.HOT}>
                        {translations.hotSort as string}
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel> {translations.noteType as string}</InputLabel>
                    <Select
                      value={newTask.noteType}
                      label={translations.noteType as string}
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          noteType: e.target.value as SearchNoteType,
                        })
                      }
                    >
                      <MenuItem value={SearchNoteType.ALL}>
                        {translations.allNotes as string}
                      </MenuItem>
                      <MenuItem value={SearchNoteType.VIDEO}>
                        {translations.videoNotes as string}
                      </MenuItem>
                      <MenuItem value={SearchNoteType.IMAGE}>
                        {translations.imageNotes as string}
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Divider textAlign="left">
                {translations.commentSettings as string}
              </Divider>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label={translations.customComment as string}
                placeholder={translations.enterCustomCommentContent as string}
                value={customComment}
                onChange={(e) => setCustomComment(e.target.value)}
                helperText={
                  translations.canAddCustomCommentOrSelectTemplate as string
                }
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                {translations.commentTemplates as string}
              </Typography>
              <Paper
                variant="outlined"
                sx={{ p: 2, maxHeight: 200, overflow: "auto" }}
              >
                {templates.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {
                      translations.noTemplatesAvailableCreateInTemplatePage as string
                    }
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

            <Grid item xs={12}>
              <Divider textAlign="left">
                {translations.executionSettings as string}
              </Divider>
            </Grid>

            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">
                  {translations.triggerType as string}
                </FormLabel>
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
                    label={translations.executeImmediately as string}
                  />
                  <FormControlLabel
                    value={TriggerType.SCHEDULED}
                    control={<Radio />}
                    label={translations.scheduledExecution as string}
                  />
                  <FormControlLabel
                    value={TriggerType.INTERVAL}
                    control={<Radio />}
                    label={translations.intervalExecution as string}
                  />
                </RadioGroup>
              </FormControl>
            </Grid>

            {newTask.triggerType === TriggerType.SCHEDULED && (
              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateTimePicker
                    label={translations.scheduledExecutionTime as string}
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
                  label={translations.executionIntervalMinutes as string}
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
                {
                  (translations.minimumDelay as Function)(
                    newTask.minDelay
                  ) as string
                }
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
                {
                  (translations.maximumDelay as Function)(
                    newTask.minDelay
                  ) as string
                }
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
                label={translations.maximumComments as string}
                value={newTask.maxComments}
                onChange={(e) =>
                  setNewTask({
                    ...newTask,
                    maxComments: Number.parseInt(e.target.value),
                  })
                }
                InputProps={{ inputProps: { min: 1 } }}
                helperText={
                  translations.taskWillStopAfterReachingCommentLimit as string
                }
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newTask.executeOnStartup}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        executeOnStartup: e.target.checked,
                      })
                    }
                  />
                }
                label={translations.executeTaskOnServiceStartup as string}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{ ml: 2 }}
              >
                {translations.autoScheduleTaskOnServiceRestart as string}
              </Typography>
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
            {translations.createTask as string}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{translations.editTask as string}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">
                  {translations.taskType as string}
                </FormLabel>
                <RadioGroup
                  row
                  value={editTask.type}
                  onChange={(e) =>
                    setEditTask({
                      ...editTask,
                      type: e.target.value as TaskType,
                    })
                  }
                >
                  <FormControlLabel
                    value={TaskType.SEARCH}
                    control={<Radio />}
                    label={translations.searchComment as string}
                  />
                  <FormControlLabel
                    value={TaskType.HOMEPAGE}
                    control={<Radio />}
                    label={translations.homepageComment as string}
                  />
                </RadioGroup>
              </FormControl>
            </Grid>

            {editTask.type === TaskType.SEARCH && (
              <>
                <Grid item xs={12}>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={[]}
                    value={editTask.keywords || []}
                    onChange={(_, newValue) => {
                      setEditTask({ ...editTask, keywords: newValue });
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
                        label={translations.searchKeywords as string}
                        placeholder={
                          translations.enterKeywordsAndPressEnterToAddMultiple as string
                        }
                        helperText={
                          translations.canAddMultipleKeywordsEachCreatesSeparateTask as string
                        }
                        fullWidth
                        required
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>{translations.sortType as string}</InputLabel>
                    <Select
                      value={editTask.sortType}
                      label={translations.sortType as string}
                      onChange={(e) =>
                        setEditTask({
                          ...editTask,
                          sortType: e.target.value as SearchSortType,
                        })
                      }
                    >
                      <MenuItem value={SearchSortType.GENERAL}>
                        {translations.generalSort as string}
                      </MenuItem>
                      <MenuItem value={SearchSortType.LATEST}>
                        {translations.latestSort as string}
                      </MenuItem>
                      <MenuItem value={SearchSortType.HOT}>
                        {translations.hotSort as string}
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>{translations.noteType as string}</InputLabel>
                    <Select
                      value={editTask.noteType}
                      label={translations.noteType as string}
                      onChange={(e) =>
                        setEditTask({
                          ...editTask,
                          noteType: e.target.value as SearchNoteType,
                        })
                      }
                    >
                      <MenuItem value={SearchNoteType.ALL}>
                        {translations.allNotes as string}
                      </MenuItem>
                      <MenuItem value={SearchNoteType.VIDEO}>
                        {translations.videoNotes as string}
                      </MenuItem>
                      <MenuItem value={SearchNoteType.IMAGE}>
                        {translations.imageNotes as string}
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Divider textAlign="left">
                {translations.commentSettings as string}
              </Divider>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label={translations.customComment as string}
                placeholder={translations.enterCustomCommentContent as string}
                value={editCustomComment}
                onChange={(e) => setEditCustomComment(e.target.value)}
                helperText={
                  translations.canAddCustomCommentOrSelectTemplate as string
                }
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                {translations.commentTemplates as string}
              </Typography>
              <Paper
                variant="outlined"
                sx={{ p: 2, maxHeight: 200, overflow: "auto" }}
              >
                {templates.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {
                      translations.noTemplatesAvailableCreateInTemplatePage as string
                    }
                  </Typography>
                ) : (
                  <Grid container spacing={1}>
                    {templates.map((template) => (
                      <Grid item xs={12} key={template.id}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={editSelectedTemplateIds.includes(
                                template.id
                              )}
                              onChange={() =>
                                handleEditTemplateToggle(template.id)
                              }
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

            <Grid item xs={12}>
              <Divider textAlign="left">
                {translations.executionSettings as string}
              </Divider>
            </Grid>

            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">
                  {translations.triggerType as string}
                </FormLabel>
                <RadioGroup
                  row
                  value={editTask.triggerType}
                  onChange={(e) =>
                    setEditTask({
                      ...editTask,
                      triggerType: e.target.value as TriggerType,
                    })
                  }
                >
                  <FormControlLabel
                    value={TriggerType.IMMEDIATE}
                    control={<Radio />}
                    label={translations.executeImmediately as string}
                  />
                  <FormControlLabel
                    value={TriggerType.SCHEDULED}
                    control={<Radio />}
                    label={translations.scheduledExecution as string}
                  />
                  <FormControlLabel
                    value={TriggerType.INTERVAL}
                    control={<Radio />}
                    label={translations.intervalExecution as string}
                  />
                </RadioGroup>
              </FormControl>
            </Grid>

            {editTask.triggerType === TriggerType.SCHEDULED && (
              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateTimePicker
                    label={translations.scheduledExecutionTime as string}
                    value={editScheduleDate}
                    onChange={(newValue) => setEditScheduleDate(newValue)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
            )}

            {editTask.triggerType === TriggerType.INTERVAL && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label={translations.executionIntervalMinutes as string}
                  value={editTask.intervalMinutes || 60}
                  onChange={(e) =>
                    setEditTask({
                      ...editTask,
                      intervalMinutes: Number.parseInt(e.target.value),
                    })
                  }
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Grid>
            )}

            <Grid item xs={12} md={6}>
              <Typography gutterBottom>
                {
                  (translations.minimumDelay as Function)(
                    editTask.minDelay
                  ) as string
                }
              </Typography>
              <Slider
                value={editTask.minDelay}
                onChange={handleEditMinDelayChange}
                min={1}
                max={300}
                valueLabelDisplay="auto"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography gutterBottom>
                {
                  (translations.maximumDelay as Function)(
                    editTask.maxDelay
                  ) as string
                }
              </Typography>
              <Slider
                value={editTask.maxDelay}
                onChange={handleEditMaxDelayChange}
                min={editTask.minDelay}
                max={600}
                valueLabelDisplay="auto"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label={translations.maximumComments as string}
                value={editTask.maxComments}
                onChange={(e) =>
                  setEditTask({
                    ...editTask,
                    maxComments: Number.parseInt(e.target.value),
                  })
                }
                InputProps={{ inputProps: { min: 1 } }}
                helperText={
                  translations.taskWillStopAfterReachingCommentLimit as string
                }
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editTask.executeOnStartup}
                    onChange={(e) =>
                      setEditTask({
                        ...editTask,
                        executeOnStartup: e.target.checked,
                      })
                    }
                  />
                }
                label={translations.executeTaskOnServiceStartup as string}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{ ml: 2 }}
              >
                {translations.autoScheduleTaskOnServiceRestart as string}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editTask.rescheduleAfterUpdate}
                    onChange={(e) =>
                      setEditTask({
                        ...editTask,
                        rescheduleAfterUpdate: e.target.checked,
                      })
                    }
                  />
                }
                label={translations.rescheduleAfterTaskUpdate as string}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{ ml: 2 }}
              >
                {translations.autoRescheduleTaskAfterUpdate as string}
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            {translations.cancel as string}
          </Button>
          <Button
            onClick={handleUpdateTask}
            variant="contained"
            color="primary"
            disabled={
              (editTask.type === TaskType.SEARCH &&
                (!editTask.keywords || editTask.keywords.length === 0)) ||
              (editCustomComment === "" && editSelectedTemplateIds.length === 0)
            }
          >
            {translations.updateTask as string}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>{translations.deleteTask as string}</DialogTitle>
        <DialogContent>
          <Typography>
            {translations.confirmDeleteTaskMessage as string}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            {translations.cancel as string}
          </Button>
          <Button onClick={confirmDeleteTask} color="error">
            {translations.delete as string}
          </Button>
        </DialogActions>
      </Dialog>

      {isCommentModalOpen && <CommentModal />}
    </Box>
  );
}
