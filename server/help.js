// help.js
const crypto = require("crypto");
const fs = require("fs");
const axios = require("axios");
const urllib = require("url");

function sign(uri, data = null, ctime = null, a1 = "", b1 = "") {
  function h(n) {
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

  const v = ctime ? ctime : Math.round(Date.now());
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
    x8: b1,
    x9: mrc(x_t + x_s),
    x10: 1,
  };
  const encodeStr = encodeUtf8(JSON.stringify(common, null, 0));
  const x_s_common = b64Encode(encodeStr);
  return { "x-s": x_s, "x-t": x_t, "x-s-common": x_s_common };
}

function getA1AndWebId() {
  function randomStr(length) {
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

const imgCdns = [
  "https://sns-img-qc.xhscdn.com",
  "https://sns-img-hw.xhscdn.com",
  "https://sns-img-bd.xhscdn.com",
  "https://sns-img-qn.xhscdn.com",
];

function getImgUrlByTraceId(trace_id, format = "png") {
  return `${
    imgCdns[Math.floor(Math.random() * imgCdns.length)]
  }/${trace_id}?imageView2/format/${format}`;
}

function getImgUrlsByTraceId(trace_id, format = "png") {
  return imgCdns.map((cdn) => `${cdn}/${trace_id}?imageView2/format/${format}`);
}

function getTraceId(img_url) {
  const trace_id = img_url.split("/").pop().split("!")[0];
  return img_url.includes("spectrum") ? `spectrum/${trace_id}` : trace_id;
}

function getImgsUrlFromNote(note) {
  const imgs = note.image_list || [];
  return imgs.length
    ? imgs.map((img) => getImgUrlByTraceId(getTraceId(img.info_list[0].url)))
    : [];
}

function getImgsUrlsFromNote(note) {
  const imgs = note.image_list || [];
  return imgs.length
    ? imgs.map((img) => getImgUrlsByTraceId(img.trace_id))
    : [];
}

const videoCdns = [
  "https://sns-video-qc.xhscdn.com",
  "https://sns-video-hw.xhscdn.com",
  "https://sns-video-bd.xhscdn.com",
  "https://sns-video-qn.xhscdn.com",
];

function getVideoUrlFromNote(note) {
  if (!note.video) return "";
  const origin_video_key = note.video.consumer?.origin_video_key || "";
  return origin_video_key
    ? `${
        videoCdns[Math.floor(Math.random() * videoCdns.length)]
      }/${origin_video_key}`
    : "";
}

function getVideoUrlsFromNote(note) {
  if (!note.video) return [];
  const origin_video_key = note.video.consumer?.origin_video_key || "";
  return origin_video_key
    ? videoCdns.map((cdn) => `${cdn}/${origin_video_key}`)
    : [];
}

async function downloadFile(url, filename) {
  const response = await axios({ url, method: "GET", responseType: "stream" });
  const writer = fs.createWriteStream(filename);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

function getValidPathName(text) {
  return text.replace(/[<>:"/\\|?*]/g, "_");
}

function mrc(e) {
  const ie = [
    0, 1996959894, 3993919788, 2567524794,
    /* ... 完整数组省略，需从 Python 代码复制过来 ... */ 755167117,
  ];
  let o = -1;
  for (let n = 0; n < Math.min(57, e.length); n++) {
    o = ie[(o & 255) ^ e.charCodeAt(n)] ^ rightWithoutSign(o, 8);
  }
  return o ^ -1 ^ 3988292384;
}

function rightWithoutSign(num, bit = 0) {
  const val = num >>> bit; // 无符号右移
  const MAX32INT = 4294967295;
  return ((val + (MAX32INT + 1)) % (2 * (MAX32INT + 1))) - MAX32INT - 1;
}

const lookup = [
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

function tripletToBase64(e) {
  return (
    lookup[63 & (e >> 18)] +
    lookup[63 & (e >> 12)] +
    lookup[(e >> 6) & 63] +
    lookup[e & 63]
  );
}

function encodeChunk(e, t, r) {
  let m = [];
  for (let b = t; b < r; b += 3) {
    const n =
      ((e[b] & 16711680) >> 16) + ((e[b + 1] & 65280) >> 8) + (e[b + 2] & 255);
    m.push(tripletToBase64(n));
  }
  return m.join("");
}

function b64Encode(e) {
  const P = e.length;
  const W = P % 3;
  const U = [];
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

function encodeUtf8(e) {
  const encoded = encodeURIComponent(e).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode("0x" + p1)
  );
  return Array.from(encoded, (char) => char.charCodeAt(0));
}

function base36encode(number) {
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

function base36decode(number) {
  return parseInt(number, 36);
}

function crc32(str) {
  const crcTable = [];
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

function getSearchId() {
  const e = BigInt(Math.floor(Date.now())) << BigInt(64);
  const t = Math.floor(Math.random() * 2147483646);
  return base36encode(Number(e + BigInt(t)));
}

function cookieStrToCookieDict(cookie_str) {
  if (!cookie_str) return {};
  return Object.fromEntries(
    cookie_str.split(";").map((block) => block.trim().split("="))
  );
}

function cookieJarToCookieStr(cookie) {
  return cookie || "";
}

function updateSessionCookiesFromCookie(session, cookie) {
  let cookieDict = cookieStrToCookieDict(cookie) || {};
  console.log("原始 cookieDict:", cookieDict); // 调试
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
  console.log("更新后的 headers.Cookie:", session.defaults.headers.Cookie); // 调试
}

module.exports = {
  sign,
  getA1AndWebId,
  getImgUrlByTraceId,
  getImgUrlsByTraceId,
  getTraceId,
  getImgsUrlFromNote,
  getImgsUrlsFromNote,
  getVideoUrlFromNote,
  getVideoUrlsFromNote,
  downloadFile,
  getValidPathName,
  mrc,
  b64Encode,
  encodeUtf8,
  getSearchId,
  cookieStrToCookieDict,
  cookieJarToCookieStr,
  updateSessionCookiesFromCookie,
};
