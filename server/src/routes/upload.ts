import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import * as DramaModel from '../models/Drama';
import { requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// 确保 uploads 目录存在
const uploadBase = path.join(process.cwd(), config.uploadDir);
const videosDir = path.join(uploadBase, 'videos');
const coversDir = path.join(uploadBase, 'covers');
[videosDir, coversDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// MIME 类型白名单
const VIDEO_MIME_TYPES = new Set([
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
  'video/avi', 'video/mkv',
]);
const IMAGE_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
]);

// 视频上传配置
const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, videosDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    // 同时检查扩展名和 MIME 类型
    if (!allowed.includes(ext) || !VIDEO_MIME_TYPES.has(file.mimetype)) {
      cb(new Error('不支持的文件格式，仅允许 mp4/webm/mov/avi/mkv'));
      return;
    }
    cb(null, true);
  },
});

// 封面上传配置
const coverStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, coversDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const coverUpload = multer({
  storage: coverStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    if (!allowed.includes(ext) || !IMAGE_MIME_TYPES.has(file.mimetype)) {
      cb(new Error('不支持的文件格式，仅允许 jpg/png/webp/gif'));
      return;
    }
    cb(null, true);
  },
});

// 上传视频（并自动创建剧集记录）- 管理员专用
router.post('/upload/video', requireAdmin, videoUpload.single('video'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '未选择视频文件' });
    }

    const { dramaId, episode_number, title } = req.body;
    if (!dramaId || !episode_number) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: '缺少短剧ID或集数' });
    }

    const videoPath = '/uploads/videos/' + req.file.filename;

    const id = await DramaModel.createEpisode({
      drama_id: parseInt(dramaId),
      episode_number: parseInt(episode_number),
      title: title || '',
      video_path: videoPath,
    });

    res.json({ success: true, data: { id, video_path: videoPath } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '上传视频失败' });
  }
});

// 上传封面 - 管理员专用
router.post('/upload/cover', requireAdmin, coverUpload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '未选择图片文件' });
    }
    const coverPath = '/uploads/covers/' + req.file.filename;
    res.json({ success: true, data: { path: coverPath } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '上传封面失败' });
  }
});

export { videoUpload, coverUpload };
export default router;
