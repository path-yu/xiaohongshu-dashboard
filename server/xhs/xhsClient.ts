import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import path from "path";
import fs from "fs";

import {
  FeedType,
  NoteType,
  SearchSortType,
  SearchNoteType,
  Note,
  getSortType,
} from "./enums.js";
import {
  ErrorEnum,
  DataFetchError,
  IPBlockError,
  SignError,
  NeedVerifyError,
} from "./exception.js";
import {
  sign,
  getImgsUrlFromNote,
  getVideoUrlFromNote,
  getValidPathName,
  getSearchId,
  downloadFile,
  cookieJarToCookieStr,
  updateSessionCookiesFromCookie,
  ISignResult,
} from "./help.js";

interface IXhsClientOptions {
  cookie?: string | null;
  user_agent?: string | null;
  timeout?: number;
  proxies?: any;
  signFunc?: (
    uri: string,
    data: any,
    a1: string,
    webSession?: string
  ) => Promise<ISignResult>;
}

class XhsClient {
  private session: AxiosInstance;
  private timeout: number;
  private external_sign: (
    uri: string,
    data: any,
    a1: string,
    webSession?: string
  ) => Promise<any>;
  private _host: string;
  private _creator_host: string;
  private _customer_host: string;
  private home: string;
  private _cookie: string | null;

  constructor({
    cookie = null,
    user_agent = null,
    timeout = 15,
    proxies = null,
    signFunc = sign,
  }: IXhsClientOptions = {}) {
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
    this._cookie = cookie;
    if (cookie) {
      updateSessionCookiesFromCookie(this.session, cookie);
    }
  }

  get cookie(): string {
    return cookieJarToCookieStr(this.session.defaults.headers.Cookie);
  }

  set cookie(cookie: string) {
    this._cookie = cookie;
    updateSessionCookiesFromCookie(this.session, cookie);
  }

  get cookie_dict(): Record<string, string> {
    return this._cookie
      ? Object.fromEntries(
          this._cookie.split(";").map((c) => c.trim().split("="))
        )
      : {};
  }

  // xhsClient.ts
  private async _pre_headers(
    url: string,
    data: any = null,
    quick_sign: boolean = false
  ): Promise<void> {
    try {
      const signs = quick_sign
        ? await sign(url, data, this.cookie_dict.a1) // 快速签名
        : await this.external_sign(
            url,
            data,
            this.cookie_dict.a1,
            this.cookie_dict.web_session // 传递 web_session
          );
      if (signs) {
        Object.assign(this.session.defaults.headers, signs);
      }
    } catch (error) {
      throw new SignError(`签名生成失败: ${error.message}`, null);
    }
  }
  async request(
    method: string,
    url: string,
    options: AxiosRequestConfig = {}
  ): Promise<any> {
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
        throw error;
      }
      throw new DataFetchError(`请求失败: ${error.message}`, error.response);
    }
  }

  async get_note_by_keyword(
    keyword: string,
    page: number = 1,
    page_size: number = 20,
    sort: number,
    note_type: SearchNoteType = SearchNoteType.ALL
  ): Promise<any> {
    const uri = "/api/sns/web/v1/search/notes";
    const data = {
      keyword,
      page,
      page_size,
      search_id: getSearchId(),
      sort: getSortType(sort),
      note_type,
    };
    return await this.post(uri, data);
  }

  async get_home_feed_category(): Promise<any[]> {
    const uri = "/api/sns/web/v1/homefeed/category";
    const response = await this.get(uri);
    return response.categories;
  }

  async get(
    uri: string,
    params: Record<string, any> | null = null,
    is_creator: boolean = false,
    is_customer: boolean = false,
    options: AxiosRequestConfig = {}
  ): Promise<any> {
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
  }

  async post(
    uri: string,
    data: any = null,
    is_creator: boolean = false,
    is_customer: boolean = false,
    options: AxiosRequestConfig = {}
  ): Promise<any> {
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
  }

  async get_note_by_id(
    note_id: string,
    xsec_token: string,
    xsec_source: string = "pc_feed"
  ): Promise<any> {
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
  }

  async get_note_comments(
    note_id: string,
    xsec_token: string = ""
  ): Promise<any> {
    const uri = "/api/sns/web/v2/comment/page";
    const params = {
      note_id,
      image_formats: "jpg,webp,avif",
      xsec_token,
      xsec_source: "pc_feed",
    };
    return await this.get(uri, params);
  }

  async get_home_feed(feed_type: FeedType = FeedType.RECOMMEND): Promise<any> {
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
  }

  async comment_note(note_id: string, content: string): Promise<any> {
    const uri = "/api/sns/web/v1/comment/post";
    const data = { note_id, content, at_users: [] };
    return await this.post(uri, data);
  }

  async save_files_from_note_id(
    note_id: string,
    dir_path: string
  ): Promise<void> {
    const note = await this.get_note_by_id(note_id, ""); // 假设 xsec_token 可为空
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
  }

  async get_user_info(user_id: string): Promise<any> {
    const uri = "/api/sns/web/v1/user/otherinfo";
    const params = { target_user_id: user_id };
    return await this.get(uri, params);
  }
}

export default XhsClient;
