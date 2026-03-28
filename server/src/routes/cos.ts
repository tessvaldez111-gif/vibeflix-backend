import { Router, Response } from 'express';
import { config } from '../config';
import { requireAdmin, AuthRequest } from '../middleware/auth';
import * as DramaModel from '../models/Drama';

// qcloud-cos-sts 是 CommonJS 模块
const STS = require('qcloud-cos-sts');

const router = Router();

// 获取 COS 临时密钥 - 管理员专用
router.get('/cos/sts', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    if (!config.cos.secretId || !config.cos.secretKey || !config.cos.bucket) {
      return res.status(500).json({ success: false, message: 'COS 未配置' });
    }

    const stsConfig = {
      secretId: config.cos.secretId,
      secretKey: config.cos.secretKey,
      durationSeconds: 1800, // 30 分钟有效期
      bucket: config.cos.bucket,
      region: config.cos.region,
      // 最小权限原则：只允许上传和读取
      policy: {
        version: '2.0',
        statement: [
          {
            effect: 'allow',
            action: [
              'name/cos:PutObject',
              'name/cos:PostObject',
              'name/cos:GetObject',
              'name/cos:PutObjectAcl',
            ],
            resource: [
              `qcs::cos:${config.cos.region}:uid/${config.cos.bucket.split('-').pop()}:${config.cos.bucket}/*`,
            ],
          },
        ],
      },
    };

    STS.getCredential(stsConfig, (err: any, result: any) => {
      if (err) {
        console.error('[COS STS]', err);
        return res.status(500).json({ success: false, message: '获取临时密钥失败' });
      }

      const cred = result.credentials;
      res.json({
        success: true,
        data: {
          tmpSecretId: cred.tmpSecretId,
          tmpSecretKey: cred.tmpSecretKey,
          sessionToken: cred.sessionToken,
          startTime: result.startTime,
          expiredTime: result.expiredTime,
          bucket: config.cos.bucket,
          region: config.cos.region,
        },
      });
    });
  } catch (err: any) {
    console.error('[COS STS]', err);
    res.status(500).json({ success: false, message: '获取临时密钥失败' });
  }
});

// COS 上传完成回调 - 创建剧集记录
router.post('/cos/video-complete', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { dramaId, episode_number, title, videoUrl } = req.body;
    if (!dramaId || !episode_number || !videoUrl) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const id = await DramaModel.createEpisode({
      drama_id: parseInt(dramaId),
      episode_number: parseInt(episode_number),
      title: title || '',
      video_path: videoUrl,
    });

    res.json({ success: true, data: { id, video_path: videoUrl } });
  } catch (err: any) {
    console.error('[COS video-complete]', err);
    res.status(500).json({ success: false, message: '创建剧集记录失败' });
  }
});

export default router;
