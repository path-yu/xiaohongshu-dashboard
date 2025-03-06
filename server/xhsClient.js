// xhsClient.js
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const {
  FeedType,
  NoteType,
  SearchSortType,
  SearchNoteType,
  Note,
} = require("./enums");
const {
  ErrorEnum,
  DataFetchError,
  IPBlockError,
  SignError,
  NeedVerifyError,
} = require("./exception");
const {
  sign,
  getImgsUrlFromNote,
  getVideoUrlFromNote,
  getValidPathName,
  getSearchId,
  downloadFile,
  cookieJarToCookieStr,
  updateSessionCookiesFromCookie,
} = require("./help");

class XhsClient {
  constructor({
    cookie = null,
    user_agent = null,
    timeout = 15,
    proxies = null,
    signFunc = null,
  } = {}) {
    this.proxies = proxies;
    this.session = axios.create({
      timeout: timeout * 1000,
      headers: {
        "User-Agent":
          user_agent ||
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
        "Content-Type": "application/json",
      },
      proxy: proxies,
    });
    this.timeout = timeout;
    this.external_sign = signFunc || sign;
    this._host = "https://edith.xiaohongshu.com";
    this._creator_host = "https://creator.xiaohongshu.com";
    this._customer_host = "https://customer.xiaohongshu.com";
    this.home = "https://www.xiaohongshu.com";
    this.cookie = cookie;
  }

  get cookie() {
    return cookieJarToCookieStr(this.session.defaults.headers.Cookie);
  }

  set cookie(cookie) {
    updateSessionCookiesFromCookie(this.session, cookie);
  }

  get cookie_dict() {
    return this.cookie
      ? Object.fromEntries(
          this.cookie.split(";").map((c) => c.trim().split("="))
        )
      : {};
  }

  async _pre_headers(url, data = null, quick_sign = false) {
    try {
      const signs = quick_sign
        ? await sign(url, data, this.cookie_dict.a1)
        : await this.external_sign(
            url,
            data,
            this.cookie_dict.a1,
            this.cookie_dict.web_session || ""
          );
      if (signs) {
        Object.assign(this.session.defaults.headers, signs);
      }
    } catch (error) {
      throw new SignError(`签名生成失败: ${error.message}`, null);
    }
  }

  async request(method, url, options = {}) {
    try {
      const response = await this.session.request({
        method,
        url,
        ...options,
      });

      if (!response.data) return response;

      let data = response.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (e) {
          return response;
        }
      }

      if (response.status === 471 || response.status === 461) {
        throw new NeedVerifyError(
          `出现验证码，请求失败，Verifytype: ${response.headers.verifytype}，Verifyuuid: ${response.headers.verifyuuid}`,
          response,
          response.headers.verifytype,
          response.headers.verifyuuid
        );
      } else if (data.success) {
        return data.data || data.success;
      } else if (data.code === ErrorEnum.IP_BLOCK.code) {
        throw new IPBlockError(ErrorEnum.IP_BLOCK.msg, response);
      } else if (data.code === ErrorEnum.SIGN_FAULT.code) {
        throw new SignError(ErrorEnum.SIGN_FAULT.msg, response);
      } else {
        throw new DataFetchError(data.msg || "数据获取失败", response);
      }
    } catch (error) {
      if (
        error instanceof NeedVerifyError ||
        error instanceof IPBlockError ||
        error instanceof SignError ||
        error instanceof DataFetchError
      ) {
        throw error; // 直接抛出已知的自定义异常
      }
      throw new DataFetchError(`请求失败: ${error.message}`, error.response);
    }
  }
  async get_note_by_keyword(
    keyword,
    page = 1,
    page_size = 20,
    sort = SearchSortType.GENERAL,
    note_type = SearchNoteType.ALL
  ) {
    /**
     * Search notes by keyword
     * @param {string} keyword - What notes you want to search
     * @param {number} [page=1] - Page number
     * @param {number} [page_size=20] - Page size
     * @param {string} [sort=SearchSortType.GENERAL] - Sort ordering
     * @param {number} [note_type=SearchNoteType.ALL] - Note type
     * @returns {Promise<Object>} - {has_more: boolean, items: Array}
     */
    try {
      const uri = "/api/sns/web/v1/search/notes";
      const data = {
        keyword,
        page,
        page_size,
        search_id: getSearchId(), // 假设 getSearchId 已定义在 help.js 中
        sort: sort,
        note_type: note_type,
      };
      return await this.post(uri, data);
    } catch (error) {
      throw new DataFetchError(
        `搜索笔记失败: ${error.message}`,
        error.response
      );
    }
  }
  async get_home_feed_category() {
    /**
     * Get home feed categories
     * @returns {Promise<Array>} - List of category objects
     */
    try {
      const uri = "/api/sns/web/v1/homefeed/category";
      const response = await this.get(uri);
      return response.categories; // 返回 categories 字段
    } catch (error) {
      throw new DataFetchError(
        `获取首页分类数据失败: ${error.message}`,
        error.response
      );
    }
  }
  async get(
    uri,
    params = null,
    is_creator = false,
    is_customer = false,
    options = {}
  ) {
    try {
      let final_uri = uri;
      if (params && typeof params === "object") {
        final_uri += "?" + new URLSearchParams(params).toString();
      }

      await this._pre_headers(final_uri, null, is_creator || is_customer);
      const endpoint = is_customer
        ? this._customer_host
        : is_creator
        ? this._creator_host
        : this._host;

      return await this.request("GET", `${endpoint}${final_uri}`, options);
    } catch (error) {
      throw error; // 将错误抛出给调用者处理
    }
  }

  async post(
    uri,
    data = null,
    is_creator = false,
    is_customer = false,
    options = {}
  ) {
    try {
      const json_str = data ? JSON.stringify(data) : null;
      await this._pre_headers(uri, data, is_creator || is_customer);
      const endpoint = is_customer
        ? this._customer_host
        : is_creator
        ? this._creator_host
        : this._host;
      return await this.request("POST", `${endpoint}${uri}`, {
        data: json_str,
        ...options,
      });
    } catch (error) {
      throw error; // 将错误抛出给调用者处理
    }
  }

  async get_note_by_id(note_id, xsec_token, xsec_source = "pc_feed") {
    try {
      const data = {
        source_note_id: note_id,
        image_formats: ["jpg", "webp", "avif"],
        extra: { need_body_topic: 1 },
        xsec_source,
        xsec_token,
      };
      const uri = "/api/sns/web/v1/feed";
      const res = await this.post(uri, data);
      return res.items[0].note_card;
    } catch (error) {
      throw new DataFetchError(
        `获取笔记 ${note_id} 失败: ${error.message}`,
        error.response
      );
    }
  }
  async get_note_comments(note_id, xsec_token = "") {
    /**
     * Get note comments
     * @param {string} note_id - Note ID you want to fetch
     * @param {string} [cursor=""] - Last cursor you got, defaults to ""
     * @param {string} [xsec_token=""] - Xsec token for the request, defaults to ""
     * @returns {Promise<Object>} - Comments data as a dictionary
     */
    try {
      const uri = "/api/sns/web/v2/comment/page";
      const params = {
        note_id,
        image_formats: "jpg,webp,avif",
        xsec_token,
        xsec_source: "pc_feed",
      };
      return await this.get(uri, params);
    } catch (error) {
      throw new DataFetchError(
        `获取笔记 ${note_id} 的评论失败: ${error.message}`,
        error.response
      );
    }
  }
  async get_home_feed(feed_type = "homefeed_recommend") {
    try {
      const uri = "/api/sns/web/v1/homefeed";
      const data = {
        cursor_score: "",
        num: 40,
        refresh_type: 1,
        note_index: 0,
        unread_begin_note_id: "",
        unread_end_note_id: "",
        unread_note_count: 0,
        category: feed_type,
      };
      return await this.post(uri, data);
    } catch (error) {
      throw new DataFetchError(
        `获取首页推荐失败: ${error.message}`,
        error.response
      );
    }
  }
  async comment_note(note_id, content) {
    try {
      const uri = "/api/sns/web/v1/comment/post";
      const data = { note_id, content, at_users: [] };
      return await this.post(uri, data);
    } catch (error) {
      throw new DataFetchError(
        `评论笔记 ${note_id} 失败: ${error.message}`,
        error.response
      );
    }
  }

  async save_files_from_note_id(note_id, dir_path) {
    try {
      const note = await this.get_note_by_id(note_id);
      let title = getValidPathName(note.title) || note_id;
      const new_dir_path = path.join(dir_path, title);

      if (!fs.existsSync(new_dir_path)) {
        fs.mkdirSync(new_dir_path, { recursive: true });
      }

      if (note.type === NoteType.VIDEO) {
        const video_url = getVideoUrlFromNote(note);
        if (!video_url) throw new Error("视频 URL 未找到");
        const video_filename = path.join(new_dir_path, `${title}.mp4`);
        await downloadFile(video_url, video_filename);
      } else {
        const img_urls = getImgsUrlFromNote(note);
        if (!img_urls.length) throw new Error("图片 URL 未找到");
        for (let [index, img_url] of img_urls.entries()) {
          const img_file_name = path.join(new_dir_path, `${title}${index}.png`);
          await downloadFile(img_url, img_file_name);
        }
      }
    } catch (error) {
      throw new DataFetchError(
        `保存笔记 ${note_id} 文件失败: ${error.message}`,
        error.response
      );
    }
  }

  async get_user_info(user_id) {
    try {
      const uri = "/api/sns/web/v1/user/otherinfo";
      const params = { target_user_id: user_id };
      return await this.get(uri, params);
    } catch (error) {
      throw new DataFetchError(
        `获取用户 ${user_id} 信息失败: ${error.message}`,
        error.response
      );
    }
  }
}

module.exports = XhsClient;
