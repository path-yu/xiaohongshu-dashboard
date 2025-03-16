import EventEmitter from "events";
import path from "path";
import { Browser, BrowserContext, chromium, Page } from "playwright";
import fs from "fs";
import { scheduleTasks } from "./taskService";
import XhsClient from "../xhs/xhsClient";
import { localFilePath } from "../main";

// 全局变量存储 a1 和 Playwright 实例
let A1 = "";
let webId = "";
let startUp = false;
export let browser: Browser | null;
let context: BrowserContext | null;
let page: Page | null;
export let xhs_client: null | XhsClient;
// // 创建事件发射器用于状态管理
export const statusEmitter = new EventEmitter();

// 新增：全局状态变量
export let playwrightStatus = "stopped"; // 默认状态为已停止
export const changeStatus = (status) => {
  playwrightStatus = status;
  statusEmitter.emit("statusUpdate");
};
// 签名函数
export async function sign(uri, data, a1, webSession) {
  try {
    // 检查页面是否可用
    if (!page || page.isClosed()) {
      console.log("页面已关闭，尝试重新初始化 Playwright");
      await stopPlaywright();
      await initializePlaywright();
    }

    // 确保页面加载完成
    await page!.waitForLoadState("domcontentloaded");
    await page!.waitForFunction(
      () => typeof (window as any)._webmsxyw === "function",
      {
        timeout: 10000,
      }
    );

    const encryptParams = await page!.evaluate(
      ([url, data]) => {
        return (window as any)._webmsxyw(url, data);
      },
      [uri, data]
    );

    console.log("签名成功", data);
    return {
      "x-s": encryptParams["X-s"],
      "x-t": encryptParams["X-t"].toString(),
    };
  } catch (error) {
    console.error("签名失败:", error);
    throw error; // 抛出错误让调用方处理
  }
}

// Playwright 配置和初始化
export const initializePlaywright = async (startUp = false) => {
  try {
    playwrightStatus = "loading"; // 设置为加载中
    console.log("正在启动 Playwright");
    console.log(process.cwd(), "play.ts"),
      path.join(process.cwd(), "stealth.min.js");
    statusEmitter.emit("statusUpdate"); // 触发状态更新
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
    await page.waitForFunction(
      () => typeof (window as any)._webmsxyw === "function"
    );
    console.log("window._webmsxyw 已加载");
    await new Promise((resolve) => setTimeout(resolve, 5000)); // 等待 5 秒
    await page.reload();
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待 1 秒
    // 获取 Cookie 中的 a1
    const cookies = await context.cookies();
    for (const cookie of cookies) {
      if (cookie.name === "webId") {
        webId = cookie.value;
        console.log(
          `当前浏览器 Cookie 中 webId 值为：${cookie.value}，请将需要使用的 webId 设置成一样方可签名成功`
        );
      }
      if (cookie.name === "a1") {
        A1 = cookie.value;
        console.log(
          `当前浏览器 Cookie 中 a1 值为：${cookie.value}，请将需要使用的 a1 设置成一样方可签名成功`
        );
      }
    }
    console.log("跳转小红书首页成功，等待调用");
    scheduleTasks({ startUp: true });
    playwrightStatus = "running"; // 初始化完成后设置为运行中
    statusEmitter.emit("statusUpdate");
    const localData = fs.readFileSync(localFilePath, "utf8");
    if (localData) {
      xhs_client = new XhsClient({
        cookie: `a1=${A1};webId=${webId};web_session=${
          JSON.parse(localData).web_session
        }`,
        signFunc: sign,
      });
      // xhs_client.comment_note(
      //   "67cc7ae5000000000302817b",
      //   "第一",
      //   "ABDQQ7qbuB6fWJoZnzkW49LwaOEipliX-kiWxkqdnv61M"
      // );
    }
  } catch (error) {
    playwrightStatus = "stopped";
    statusEmitter.emit("statusUpdate");
    return {
      error: error.message,
    };
  }
};
// 停止 Playwright
export const stopPlaywright = async () => {
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
  statusEmitter.emit("statusUpdate"); // 触发状态更新
};
