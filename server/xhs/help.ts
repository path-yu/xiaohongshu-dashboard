import axios from "axios";
import fs from "fs";
import crypto from "crypto";

export interface ISignResult {
  "x-s": string;
  "x-t": string;
  "x-s-common"?: string;
}

export async function sign(
  uri: string,
  data: any,
  a1: string,
  webSession?: string // 可选参数，替换原来的 ctime 和 b1
): Promise<ISignResult> {
  function h(n: string): string {
    let m = "";
    const d =
      "A4NjFqYu5wPHsO0XTdDgMa2r1ZQocVte9UJBvk6/7=yRnhISGKblCWi+LpfE8xzm3";
    for (let i = 0; i < 32; i += 3) {
      const o = n.charCodeAt(i);
      const g = i + 1 < 32 ? n.charCodeAt(i + 1) : 0;
      const h = i + 2 < 32 ? n.charCodeAt(i + 2) : 0;
      const x = ((o & 3) << 4) | (g >> 4);
      const p = ((15 & g) << 2) | (h >> 6);
      const v = o >> 2;
      const b = h ? h & 63 : 64;
      const p_adjusted = g ? p : 64;
      const b_adjusted = g ? b : 64;
      m += d[v] + d[x] + d[p_adjusted] + d[b_adjusted];
    }
    return m;
  }

  const v = Math.round(Date.now()); // 移除 ctime 参数，使用当前时间
  const raw_str = `${v}test${uri}${
    data && typeof data === "object" ? JSON.stringify(data, null, 0) : ""
  }`;
  const md5_str = crypto.createHash("md5").update(raw_str).digest("hex");
  const x_s = h(md5_str);
  const x_t = v.toString();

  const common = {
    s0: 5,
    s1: "",
    x0: "1",
    x1: "3.2.0",
    x2: "Windows",
    x3: "xhs-pc-web",
    x4: "2.3.1",
    x5: a1,
    x6: x_t,
    x7: x_s,
    x8: webSession || "", // 使用 webSession 替换 b1
    x9: mrc(x_t + x_s),
    x10: 1,
  };
  const encodeStr = encodeUtf8(JSON.stringify(common, null, 0));
  const x_s_common = b64Encode(encodeStr);

  // 返回 Promise
  return Promise.resolve({ "x-s": x_s, "x-t": x_t, "x-s-common": x_s_common });
}

export function getA1AndWebId(): [string, string] {
  function randomStr(length: number): string {
    const alphabet =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from(
      { length },
      () => alphabet[Math.floor(Math.random() * alphabet.length)]
    ).join("");
  }

  const d = Date.now().toString(16) + randomStr(30) + "5" + "0" + "000";
  const g = (d + crc32(d)).slice(0, 52);
  return [g, crypto.createHash("md5").update(g).digest("hex")];
}

const imgCdns: string[] = [
  "https://sns-img-qc.xhscdn.com",
  "https://sns-img-hw.xhscdn.com",
  "https://sns-img-bd.xhscdn.com",
  "https://sns-img-qn.xhscdn.com",
];

export function getImgUrlByTraceId(
  trace_id: string,
  format: string = "png"
): string {
  return `${
    imgCdns[Math.floor(Math.random() * imgCdns.length)]
  }/${trace_id}?imageView2/format/${format}`;
}

export function getImgUrlsByTraceId(
  trace_id: string,
  format: string = "png"
): string[] {
  return imgCdns.map((cdn) => `${cdn}/${trace_id}?imageView2/format/${format}`);
}

export function getTraceId(img_url: string): string {
  const trace_id = img_url.split("/").pop()?.split("!")[0] || "";
  return img_url.includes("spectrum") ? `spectrum/${trace_id}` : trace_id;
}

export function getImgsUrlFromNote(note: any): string[] {
  const imgs = note.image_list || [];
  return imgs.length
    ? imgs.map((img: any) =>
        getImgUrlByTraceId(getTraceId(img.info_list[0].url))
      )
    : [];
}

export function getImgsUrlsFromNote(note: any): string[][] {
  const imgs = note.image_list || [];
  return imgs.length
    ? imgs.map((img: any) => getImgUrlsByTraceId(img.trace_id))
    : [];
}

const videoCdns: string[] = [
  "https://sns-video-qc.xhscdn.com",
  "https://sns-video-hw.xhscdn.com",
  "https://sns-video-bd.xhscdn.com",
  "https://sns-video-qn.xhscdn.com",
];

export function getVideoUrlFromNote(note: any): string {
  if (!note.video) return "";
  const origin_video_key = note.video.consumer?.origin_video_key || "";
  return origin_video_key
    ? `${
        videoCdns[Math.floor(Math.random() * videoCdns.length)]
      }/${origin_video_key}`
    : "";
}

export function getVideoUrlsFromNote(note: any): string[] {
  if (!note.video) return [];
  const origin_video_key = note.video.consumer?.origin_video_key || "";
  return origin_video_key
    ? videoCdns.map((cdn) => `${cdn}/${origin_video_key}`)
    : [];
}

export async function downloadFile(
  url: string,
  filename: string
): Promise<void> {
  const response = await axios({ url, method: "GET", responseType: "stream" });
  const writer = fs.createWriteStream(filename);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

export function getValidPathName(text: string): string {
  return text.replace(/[<>:"/\\|?*]/g, "_");
}

export function mrc(e: string): number {
  const ie: number[] = [
    0, 1996959894, 3993919788, 2567524794,
    // ... 完整数组省略，需从 Python 代码复制过来 ...
    755167117,
  ];
  let o = -1;
  for (let n = 0; n < Math.min(57, e.length); n++) {
    o = ie[(o & 255) ^ e.charCodeAt(n)] ^ rightWithoutSign(o, 8);
  }
  return o ^ -1 ^ 3988292384;
}

export function rightWithoutSign(num: number, bit: number = 0): number {
  const val = num >>> bit;
  const MAX32INT = 4294967295;
  return ((val + (MAX32INT + 1)) % (2 * (MAX32INT + 1))) - MAX32INT - 1;
}

const lookup: string[] = [
  "Z",
  "m",
  "s",
  "e",
  "r",
  "b",
  "B",
  "o",
  "H",
  "Q",
  "t",
  "N",
  "P",
  "+",
  "w",
  "O",
  "c",
  "z",
  "a",
  "/",
  "L",
  "p",
  "n",
  "g",
  "G",
  "8",
  "y",
  "J",
  "q",
  "4",
  "2",
  "K",
  "W",
  "Y",
  "j",
  "0",
  "D",
  "S",
  "f",
  "d",
  "i",
  "k",
  "x",
  "3",
  "V",
  "T",
  "1",
  "6",
  "I",
  "l",
  "U",
  "A",
  "F",
  "M",
  "9",
  "7",
  "h",
  "E",
  "C",
  "v",
  "u",
  "R",
  "X",
  "5",
];

function tripletToBase64(e: number): string {
  return (
    lookup[63 & (e >> 18)] +
    lookup[63 & (e >> 12)] +
    lookup[(e >> 6) & 63] +
    lookup[e & 63]
  );
}

function encodeChunk(e: number[], t: number, r: number): string {
  let m: string[] = [];
  for (let b = t; b < r; b += 3) {
    const n =
      ((e[b] & 16711680) >> 16) + ((e[b + 1] & 65280) >> 8) + (e[b + 2] & 255);
    m.push(tripletToBase64(n));
  }
  return m.join("");
}

export function b64Encode(e: number[]): string {
  const P = e.length;
  const W = P % 3;
  const U: string[] = [];
  const z = 16383;
  let H = 0;
  const Z = P - W;
  while (H < Z) {
    U.push(encodeChunk(e, H, Math.min(H + z, Z)));
    H += z;
  }
  if (W === 1) {
    const F = e[P - 1];
    U.push(lookup[F >> 2] + lookup[(F << 4) & 63] + "==");
  } else if (W === 2) {
    const F = (e[P - 2] << 8) + e[P - 1];
    U.push(
      lookup[F >> 10] + lookup[63 & (F >> 4)] + lookup[(F << 2) & 63] + "="
    );
  }
  return U.join("");
}

export function encodeUtf8(e: string): number[] {
  const encoded = encodeURIComponent(e).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  );
  return Array.from(encoded, (char) => char.charCodeAt(0));
}

export function base36encode(number: number): string {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let base36 = "";
  let sign = number < 0 ? "-" : "";
  number = Math.abs(number);
  if (number < alphabet.length) return sign + alphabet[number];
  while (number) {
    base36 = alphabet[number % 36] + base36;
    number = Math.floor(number / 36);
  }
  return sign + base36;
}

export function base36decode(number: string): number {
  return parseInt(number, 36);
}

export const sleep = (ms: number, signal?: AbortSignal): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new Error("Sleep aborted"));
    }

    const timeout = setTimeout(resolve, ms);

    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        reject(new Error("Sleep aborted"));
      },
      { once: true }
    );
  });
};

export function crc32(str: string): number {
  const crcTable: number[] = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[i] = c;
  }
  let crc = 0 ^ -1;
  for (let i = 0; i < str.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

export function getSearchId(): string {
  const e = BigInt(Math.floor(Date.now())) << BigInt(64);
  const t = Math.floor(Math.random() * 2147483646);
  return base36encode(Number(e + BigInt(t)));
}

export function cookieStrToCookieDict(
  cookie_str: string
): Record<string, string> {
  if (!cookie_str) return {};
  return Object.fromEntries(
    cookie_str.split(";").map((block) => block.trim().split("="))
  );
}

export function cookieJarToCookieStr(cookie: any): string {
  return cookie || "";
}

export function updateSessionCookiesFromCookie(
  session: any,
  cookie: string
): void {
  let cookieDict = cookieStrToCookieDict(cookie) || {};
  if (!cookieDict.a1 || !cookieDict.webId) {
    cookieDict = {
      ...cookieDict,
      a1: "187d2defea8dz1fgwydnci40kw265ikh9fsxn66qs50000726043",
      webId: "ba57f42593b9e55840a289fa0b755374",
    };
  }
  if (!cookieDict.gid) {
    cookieDict = {
      ...cookieDict,
      "gid.sign": "PSF1M3U6EBC/Jv6eGddPbmsWzLI=",
      gid: "yYWfJfi820jSyYWfJfdidiKK0YfuyikEvfISMAM348TEJC28K23TxI888WJK84q8S4WfY2Sy",
    };
  }
  session.defaults.headers.Cookie = Object.entries(cookieDict)
    .map(([k, v]) => `${k}=${v}`)
    .join(";");
}
// Function to get random delay between min and max
export const getRandomDelay = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
// Function to get random comment
export const getRandomComment = (comments, useRandomEmoji) => {
  const comment = comments[Math.floor(Math.random() * comments.length)];
  // const emojis = ["👍", "❤️", "😊", "🔥", "👏"];
  // return useRandomEmoji
  //   ? `${comment} ${emojis[Math.floor(Math.random() * emojis.length)]}`
  //   : comment;
  return comment;
};
export const getRandomKeyword = (keywords) => {
  if (!Array.isArray(keywords) || keywords.length === 0) {
    throw new Error("task.keywords must be a non-empty array");
  }
  const randomIndex = Math.floor(Math.random() * keywords.length);
  return keywords[randomIndex];
};
