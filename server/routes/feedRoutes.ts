import express from "express";
import { xhs_client } from "../services/playwrightServices";
import { FeedType, SearchSortType, SearchNoteType } from "../xhs/enums";

const router = express.Router();

// 获取首页推荐数据
router.get("/homefeed/recommend", async (req, res) => {
  try {
    const feedData = await xhs_client!.get_home_feed(
      (req.query.feed_type as FeedType.RECOMMEND) || FeedType.RECOMMEND
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

// 获取首页分类数据
router.get("/homefeed/categories", async (req, res) => {
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

// 搜索笔记
router.get("/search/notes", async (req, res) => {
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
    } = req.query as any;
    const result = await xhs_client.get_note_by_keyword(
      keyword as string,
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

// 评论笔记
router.post("/comment/note", async (req, res) => {
  try {
    if (!xhs_client) {
      throw new Error("XhsClient 未初始化，请先启动 Playwright");
    }
    const { note_id, content, xsec_token } = req.body;
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

export default router;
