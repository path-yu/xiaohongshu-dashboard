// enums.js
const FeedType = {
  RECOMMEND: "homefeed_recommend",
  FASION: "homefeed.fashion_v3",
  FOOD: "homefeed.food_v3",
  COSMETICS: "homefeed.cosmetics_v3",
  MOVIE: "homefeed.movie_and_tv_v3",
  CAREER: "homefeed.career_v3",
  EMOTION: "homefeed.love_v3",
  HOURSE: "homefeed.household_product_v3",
  GAME: "homefeed.gaming_v3",
  TRAVEL: "homefeed.travel_v3",
  FITNESS: "homefeed.fitness_v3",
};

const NoteType = {
  NORMAL: "normal",
  VIDEO: "video",
};

const SearchSortType = {
  GENERAL: "general",
  MOST_POPULAR: "popularity_descending",
  LATEST: "time_descending",
};

const SearchNoteType = {
  ALL: 0,
  VIDEO: 1,
  IMAGE: 2,
};

class Note {
  constructor(
    note_id,
    title,
    desc,
    type,
    user,
    img_urls,
    video_url,
    tag_list,
    at_user_list,
    collected_count,
    comment_count,
    liked_count,
    share_count,
    time,
    last_update_time
  ) {
    this.note_id = note_id;
    this.title = title;
    this.desc = desc;
    this.type = type;
    this.user = user;
    this.img_urls = img_urls;
    this.video_url = video_url;
    this.tag_list = tag_list;
    this.at_user_list = at_user_list;
    this.collected_count = collected_count;
    this.comment_count = comment_count;
    this.liked_count = liked_count;
    this.share_count = share_count;
    this.time = time;
    this.last_update_time = last_update_time;
  }
}

module.exports = { FeedType, NoteType, SearchSortType, SearchNoteType, Note };
