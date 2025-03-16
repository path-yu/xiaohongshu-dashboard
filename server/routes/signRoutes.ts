import express from "express";
import { sign } from "../services/playwrightServices";

const router = express.Router();

// 路由：签名 endpoint
router.post("/", async (req, res) => {
  const { uri, data, a1, web_session } = req.body;
  try {
    const result = await sign(uri, data, a1, web_session);
    res.json(result);
    console.log("签名成功", result);
  } catch (error) {
    console.error("签名失败:", error);
    res.status(500).json({ error: "签名失败" });
  }
});

export default router;
