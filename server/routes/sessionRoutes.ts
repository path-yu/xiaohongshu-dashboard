import express from "express";
import fs from "fs";
import {
  initializePlaywright,
  stopPlaywright,
} from "../services/playwrightServices";
import { localFilePath } from "../main";

const router = express.Router();

// 路由：设置 web_session
router.post("/set-web-session", (req, res) => {
  const { web_session } = req.body;
  const fileData = fs.readFileSync(localFilePath);
  let parseData = JSON.parse(fileData.toString());
  // 更新
  if (parseData["web_session"] !== web_session) {
    stopPlaywright();
    setTimeout(() => {
      initializePlaywright();
    }, 300);
  }
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
router.get("/get-web-session", (req, res) => {
  fs.readFile(localFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("读取文件失败", err);
      res.status(500).json({ error: "读取 web_session 失败" });
    } else {
      res.json({ web_session: data });
    }
  });
});

export default router;
