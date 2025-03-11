// types.d.ts

// 任务状态枚举
export enum TaskStatus {
  Idle = "idle",
  Running = "running",
  Paused = "paused",
  Completed = "completed",
  Error = "error",
}

// 触发类型枚举
export enum TriggerType {
  Immediate = "immediate",
  Scheduled = "scheduled",
  Interval = "interval",
}

// 任务数据类型
export interface ITask {
  intervalMinutes: any;
  id: string;
  type: string; // 例如 "search" 或 "homepage"
  status: TaskStatus;
  keywords: string[];
  sortType?: number; // 可选，排序类型
  comments: string[];
  useRandomComment: boolean;
  useRandomEmoji: boolean;
  minDelay: number; // 最小延迟时间（秒）
  maxDelay: number; // 最大延迟时间（秒）
  maxComments: number; // 最大评论数
  completedComments: number; // 已完成评论数
  triggerType: TriggerType;
  createdAt: string; // ISO 格式时间字符串
  updatedAt: string; // ISO 格式时间字符串
  scheduleTime: string; // ISO 格式时间字符串
  error: string; // 错误信息，可能为空
  noteType: number; // 笔记类型，使用 number 统一（忽略 note_type 字符串）
  executeOnStartup: boolean; // 是否在启动时执行
  rescheduleAfterUpdate: boolean; // 更新后是否重新调度
}

// 日志数据类型
export interface ILog {
  id: string;
  taskId: string; // 关联的任务 ID
  noteId: string; // 笔记 ID
  noteTitle: string; // 笔记标题
  comment: string; // 评论内容
  timestamp: string; // ISO 格式时间字符串
  success: boolean; // 操作是否成功
  error?: string; // 错误信息，可选
}

// note.ts 或 types.d.ts

// 笔记类型枚举（从 enums.ts 中引用）
export enum NoteType {
  NORMAL = "normal",
  VIDEO = "video",
}

// 用户信息（简化为基本字段，可根据实际数据扩展）
export interface IUser {
  user_id: string;
  nickname: string;
  avatar?: string;
  [key: string]: any; // 允许扩展其他字段
}

// 图片信息
export interface IImageInfo {
  url: string;
  trace_id?: string; // 从 getTraceId 中推导
  width?: number;
  height?: number;
  [key: string]: any; // 允许扩展
}

// 视频信息
export interface IVideoInfo {
  consumer?: {
    origin_video_key?: string; // 从 getVideoUrlFromNote 中推导
  };
  url?: string;
  duration?: number;
  [key: string]: any; // 允许扩展
}

// 笔记核心数据
export interface INote {
  note_id: string; // 笔记唯一标识
  title: string; // 标题
  desc: string; // 描述或正文
  type: NoteType; // 笔记类型（普通或视频）
  user: IUser; // 作者信息
  image_list?: IImageInfo[]; // 图片列表（可选，普通笔记使用）
  video?: IVideoInfo; // 视频信息（可选，视频笔记使用）
  tag_list: string[]; // 标签列表
  at_user_list: IUser[]; // @ 的用户列表
  collected_count: number; // 收藏数
  comment_count: number; // 评论数
  liked_count: number; // 点赞数
  share_count: number; // 分享数
  time: string; // 创建时间（ISO 格式）
  last_update_time: string; // 最后更新时间（ISO 格式）
  xsec_token?: string; // 用于评论等的 token（可选）
  [key: string]: any; // 允许扩展其他字段
}

// 可选：完整的 API 响应结构（如果需要）
export interface INoteResponse {
  items: {
    note_card: INote;
  }[];
  has_more?: boolean;
  cursor?: string;
}
