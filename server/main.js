const express = require("express");
const path = require("path");
const { exec } = require("child_process");
const { chromium } = require("playwright");
const fs = require("fs");
const cors = require("cors"); // 引入 CORS 中间件
const XhsClient = require("./xhsClient");
const app = express();
const port = 3000;
const {
  FeedType,
  NoteType,
  SearchSortType,
  SearchNoteType,
  Note,
} = require("./enums");
// 允许所有来源的请求
app.use(cors());
let xhs_client;

let localFilePath = path.join(process.cwd(), "local.json");
const localData = fs.readFileSync(localFilePath, "utf8");
// 中间件以解析 JSON 请求体
app.use(express.json());

// 全局变量存储 a1 和 Playwright 实例
let A1 = "";
let webId = "";

let browser = null;
let context = null;
let page = null;
// 新增：全局状态变量
let playwrightStatus = "stopped"; // 默认状态为已停止
// Playwright 配置和初始化
const initializePlaywright = async () => {
  playwrightStatus = "loading"; // 设置为加载中
  console.log("正在启动 Playwright");
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext();

  // 使用 path.join 指定当前目录下的 stealth.min.js
  const stealthJsPath = path.join(process.cwd(), "stealth.min.js");
  // 读取 stealth.min.js 内容
  const stealthScript = fs.readFileSync(stealthJsPath, "utf8");
  await context.addInitScript(stealthScript);

  page = await context.newPage();

  // 访问小红书首页
  console.log("正在跳转至小红书首页");
  await page.goto("https://www.xiaohongshu.com");

  // 等待 window._webmsxyw 加载
  await page.waitForFunction(() => typeof window._webmsxyw === "function");

  console.log("window._webmsxyw 已加载");
  await new Promise((resolve) => setTimeout(resolve, 5000)); // 等待 5 秒
  await page.reload();
  await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待 1 秒

  // 获取 Cookie 中的 a1
  const cookies = await context.cookies();
  for (const cookie of cookies) {
    if (cookie.name === "a1") {
      A1 = cookie.value;
      console.log(
        `当前浏览器 Cookie 中 a1 值为：${cookie.value}，请将需要使用的 a1 设置成一样方可签名成功`
      );
    }
    if (cookie.name === "webId") {
      webId = cookie.value;
      console.log(
        `当前浏览器 Cookie 中 webId 值为：${cookie.value}，请将需要使用的 webId 设置成一样方可签名成功`
      );
    }
  }
  console.log("跳转小红书首页成功，等待调用");
  const localData = fs.readFileSync(localFilePath, "utf8");
  if (localData) {
    console.log(JSON.parse(localData).web_session, "3");

    xhs_client = new XhsClient({
      cookie: `a1=${A1};webId=${webId};web_session=${
        JSON.parse(localData).web_session
      }`,
      // cookie: `a1=1956ba3a7734qv4kqtbukckegubvzdmunsjmo6bot50000689362;webId=eb910789b26c9427e27fb6c87cb45464;web_session=$${
      //   JSON.parse(localData).web_session
      // }`,
      signFunc: sign,
    });
  }
  playwrightStatus = "running"; // 初始化完成后设置为运行中
  // try {
  //   const note_info = await xhs_client.get_home_feed();
  //   console.log(note_info);
  // } catch (error) {
  //   console.error("错误:", error.message, error.response?.data);
  // }
};

// 停止 Playwright
const stopPlaywright = async () => {
  if (browser) {
    await browser.close();
    browser = null;
    context = null;
    page = null;
    console.log("Playwright 浏览器已关闭");
    playwrightStatus = "stopped"; // 关闭后设置为已停止
  } else {
    console.log("Playwright 浏览器未启动");
    playwrightStatus = "stopped";
  }
};
// 签名函数
async function sign(uri, data, a1, webSession) {
  const encryptParams = await page.evaluate(
    ([url, data]) => {
      return window._webmsxyw(url, data);
    },
    [uri, data]
  );
  console.log("签名成功", data);

  return {
    "x-s": encryptParams["X-s"],
    "x-t": encryptParams["X-t"].toString(),
  };
}

// 路由：签名 endpoint
app.post("/sign", async (req, res) => {
  const { uri, data, a1, web_session } = req.body;
  try {
    const result = await sign(uri, data, A1, web_session);
    res.json(result);
    console.log("签名成功", result);
  } catch (error) {
    console.error("签名失败:", error);
    res.status(500).json({ error: "签名失败" });
  }
});

// 路由：获取 a1
app.get("/api/a1", (req, res) => {
  res.json({ a1: A1 });
});

// 路由：控制 Playwright 启动和停止
app.post("/api/control", async (req, res) => {
  const { action } = req.body;

  if (action === "start") {
    if (!browser) {
      await initializePlaywright();
      res.json({ message: "Playwright 已启动" });
    } else {
      res.status(400).json({ error: "Playwright 已经在运行中" });
    }
  } else if (action === "stop") {
    if (browser) {
      await stopPlaywright();
      res.json({ message: "Playwright 已停止" });
    } else {
      res.status(400).json({ error: "Playwright 未启动" });
    }
  } else {
    res.status(400).json({ error: "无效的操作。请使用 'start' 或 'stop'" });
  }
});
app.get("/api/homefeed/recommend", async (req, res) => {
  try {
    const feedData = await xhs_client.get_home_feed(
      req.query.feed_type || FeedType.RECOMMEND
    );
    res
      .status(200)
      .json({ success: true, data: feedData, message: "获取首页推荐数据成功" });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      data: error.response?.data,
    });
  }
});
// 路由：设置 web_session
app.post("/api/set-web-session", (req, res) => {
  const { web_session } = req.body;

  if (web_session) {
    // 将 web_session 保存到本地文件中
    fs.writeFile(localFilePath, JSON.stringify({ web_session }), (err) => {
      if (err) {
        console.error("写入文件失败", err);
        res.status(500).json({ error: "保存 web_session 失败" });
      } else {
        console.log("web_session 已保存");
        res.json({ message: "web_session 保存成功" });
      }
    });
  } else {
    res.status(400).json({ error: "web_session 不能为空" });
  }
});

// 路由：获取 web_session
app.get("/api/get-web-session", (req, res) => {
  fs.readFile(localFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("读取文件失败", err);
      res.status(500).json({ error: "读取 web_session 失败" });
    } else {
      res.json({ web_session: data });
    }
  });
});
// 设置web-session
app.get("/api/get-web-session", (req, res) => {
  fs.readFile(sessionFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("读取文件失败", err);
      res.status(500).json({ error: "读取 web_session 失败" });
    } else {
      res.json({ web_session: data });
    }
  });
});
// server.js
app.get("/api/search/notes", async (req, res) => {
  try {
    if (!xhs_client) {
      throw new Error("XhsClient 未初始化，请先启动 Playwright");
    }
    const {
      keyword,
      page = 1,
      page_size = 20,
      sort = SearchSortType.GENERAL,
      note_type = SearchNoteType.ALL,
    } = req.query;
    const result = await xhs_client.get_note_by_keyword(
      keyword,
      parseInt(page),
      parseInt(page_size),
      sort,
      parseInt(note_type)
    );
    res.status(200).json({
      success: true,
      data: result,
      message: "搜索笔记成功",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      data: error.response ? error.response.data : null,
    });
  }
});
app.post("/api/comment/note", async (req, res) => {
  try {
    if (!xhs_client) {
      throw new Error("XhsClient 未初始化，请先启动 Playwright");
    }
    const { note_id, content } = req.body;
    if (!note_id || !content) {
      throw new Error("note_id 和 content 为必填参数");
    }
    const result = await xhs_client.comment_note(note_id, content);
    res.status(200).json({
      success: true,
      data: result,
      message: "评论笔记成功",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      data: error.response ? error.response.data : null,
    });
  }
});
// 获取首页分类数据
app.get("/api/homefeed/categories", async (req, res) => {
  try {
    if (!xhs_client) {
      throw new Error("XhsClient 未初始化，请先启动 Playwright");
    }
    const categories = await xhs_client.get_home_feed_category();
    res.status(200).json({
      success: true,
      data: categories,
      message: "获取首页分类数据成功",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      data: error.response ? error.response.data : null,
    });
  }
});
app.get("/api/playwright/status", async (req, res) => {
  try {
    let statusMessage;
    switch (playwrightStatus) {
      case "loading":
        statusMessage = "Playwright 正在加载";
        break;
      case "running":
        statusMessage = "Playwright 正在运行";
        break;
      case "stopped":
        statusMessage = "Playwright 已停止";
        break;
      default:
        statusMessage = "未知状态";
    }

    // 额外检查：确保状态与实际一致
    if (
      playwrightStatus === "running" &&
      (!browser || (await browser.contexts()).length === 0)
    ) {
      playwrightStatus = "stopped";
      statusMessage = "Playwright 已停止（检测到异常）";
    }

    res.status(200).json({
      status: playwrightStatus,
      message: statusMessage,
    });
  } catch (error) {
    res.status(500).json({
      error: "查询 Playwright 状态失败",
      message: error.message,
    });
  }
});
app.listen(port, async () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(process.platform);
  let localData;
  try {
    localData = fs.readFileSync(localFilePath, "utf8");
  } catch (error) {
    console.error("读取 local.json 失败:", error.message);
  }

  if (localData) {
    let data = JSON.parse(localData).web_session;
    if (data) {
      await initializePlaywright();
    }
  }
  // 可选：打开浏览器
  // if (process.platform === "win32") {
  //   exec(`start http://localhost:${port}`);
  // } else if (process.platform === "darwin") {
  //   exec(`open http://localhost:${port}`);
  // } else if (process.platform === "linux") {
  //   exec(`xdg-open http://localhost:${port}`);
  // }
});
// 将 dist 目录指向正确的路径，确保访问静态资源
app.use(express.static(path.join(process.cwd(), "dist")));
// 默认返回首页 HTML
app.get("*", (req, res) => {
  const filePath = path.join(process.cwd(), "dist/index.html");
  res.sendFile(filePath);
});
