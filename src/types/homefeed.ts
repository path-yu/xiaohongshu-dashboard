export interface HomeFeedResponse {
  success: boolean;
  message: string;
  data: HomeFeedData;
  error?: string;
}

export interface HomeFeedData {
  cursor_score: string;
  items: HomeFeedItem[];
}

export interface HomeFeedItem {
  id: string;
  ignore: boolean;
  model_type: string;
  note_card: NoteCard;
  track_id: string;
  xsec_token: string;
}

export interface NoteCard {
  cover: Cover;
  display_title: string;
  interact_info: InteractInfo;
  type: string;
  user: User;
}

export interface Cover {
  file_id: string;
  height: number;
  width: number;
  url: string;
  url_default: string;
  url_pre: string;
  info_list?: any[];
}

export interface InteractInfo {
  liked: boolean;
  liked_count: string;
}

export interface User {
  avatar: string;
  nick_name: string;
  nickname: string;
  user_id: string;
  xsec_token: string;
}

export enum FeedType {
  FOLLOW = "follow",
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
