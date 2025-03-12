export enum FeedType {
  RECOMMEND = "homefeed_recommend",
  FASION = "homefeed.fashion_v3",
  FOOD = "homefeed.food_v3",
  COSMETICS = "homefeed.cosmetics_v3",
  MOVIE = "homefeed.movie_and_tv_v3",
  CAREER = "homefeed.career_v3",
  EMOTION = "homefeed.love_v3",
  HOURSE = "homefeed.household_product_v3",
  GAME = "homefeed.gaming_v3",
  TRAVEL = "homefeed.travel_v3",
  FITNESS = "homefeed.fitness_v3",
}

export enum NoteType {
  NORMAL = "normal",
  VIDEO = "video",
}

export enum SearchSortType {
  GENERAL = "general",
  LATEST = "time_descending",
  MOST_POPULAR = "popularity_descending",
}

export function getSortType(sort: number | string): SearchSortType {
  if (sort == 0) return SearchSortType.GENERAL;
  if (sort == 1) return SearchSortType.LATEST;
  if (sort == 2) return SearchSortType.MOST_POPULAR;
  throw new Error("Invalid sort value");
}

export enum SearchNoteType {
  ALL = 0,
  VIDEO = 1,
  IMAGE = 2,
}

export interface INote {
  note_id: string;
  title: string;
  desc: string;
  type: NoteType;
  user: any; // 根据实际用户对象结构定义更具体的类型
  img_urls: string[];
  video_url: string;
  tag_list: string[];
  at_user_list: any[]; // 根据实际 @ 用户对象定义类型
  collected_count: number;
  comment_count: number;
  liked_count: number;
  share_count: number;
  time: string;
  last_update_time: string;
}

export class Note implements INote {
  constructor(
    public note_id: string,
    public title: string,
    public desc: string,
    public type: NoteType,
    public user: any,
    public img_urls: string[],
    public video_url: string,
    public tag_list: string[],
    public at_user_list: any[],
    public collected_count: number,
    public comment_count: number,
    public liked_count: number,
    public share_count: number,
    public time: string,
    public last_update_time: string
  ) {}
}
