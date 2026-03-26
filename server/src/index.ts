import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from './config';
import { initDatabase } from './db';
import dramaRoutes from './routes/drama';
import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload';
import categoryRoutes from './routes/category';
import userRoutes from './routes/user';
import interactionRoutes from './routes/interaction';
import orderRoutes from './routes/order';
import paymentRoutes from './routes/payment';
import adminRoutes from './routes/admin';
import featureRoutes from './routes/features';

const app = express();

// 安全中间件
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));

// CORS - 允许配置的前端地址和管理后台同源请求
const allowedOrigins = [config.serverUrl, ...config.clientUrl.split(',').map(s => s.trim()).filter(Boolean)];
app.use(cors({
  origin: (origin, callback) => {
    // 允许无 origin 的请求（Postman、服务端请求等）
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// 请求日志
app.use(morgan(config.isDev ? 'dev' : 'combined'));

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务 - 视频和封面图片
app.use('/uploads', express.static(path.join(process.cwd(), config.uploadDir)));

// 全局请求频率限制
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 200, // 每个 IP 最多 200 次请求
  message: { success: false, message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', generalLimiter);

// 登录/注册频率限制（更严格）
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 10, // 每个 IP 最多 10 次登录尝试
  message: { success: false, message: '登录尝试过于频繁，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);
app.use('/api/admin/login', authLimiter);

// API 路由
app.use('/api', dramaRoutes);
app.use('/api', authRoutes);
app.use('/api', uploadRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api', interactionRoutes);
app.use('/api', orderRoutes);
app.use('/api', paymentRoutes);
app.use('/api', adminRoutes);
app.use('/api', featureRoutes);

// 管理后台页面
app.get('/admin', (_req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// PayPal 支付回调页面 (fix #14)
app.get('/payment/success', (_req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>支付成功</title>
<style>body{font-family:-apple-system,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f7}
.box{text-align:center;padding:40px;background:white;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.1)}
.icon{font-size:64px;margin-bottom:16px}h2{margin:0 0 8px;color:#2e7d32}p{color:#666;margin-bottom:24px}
a{display:inline-block;padding:12px 32px;background:#667eea;color:white;border-radius:8px;text-decoration:none;font-weight:600}
a:hover{opacity:0.9}</style></head><body><div class="box"><div class="icon">&#10003;</div><h2>支付成功</h2>
<p>积分已到账，感谢您的充值！</p><a href="/">返回首页</a></div></body></html>`);
});

app.get('/payment/cancel', (_req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>支付取消</title>
<style>body{font-family:-apple-system,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f7}
.box{text-align:center;padding:40px;background:white;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.1)}
.icon{font-size:64px;margin-bottom:16px}h2{margin:0 0 8px;color:#e65100}p{color:#666;margin-bottom:24px}
a{display:inline-block;padding:12px 32px;background:#667eea;color:white;border-radius:8px;text-decoration:none;font-weight:600}
a:hover{opacity:0.9}</style></head><body><div class="box"><div class="icon">&#10007;</div><h2>支付已取消</h2>
<p>您可以随时在个人中心重新充值。</p><a href="/">返回首页</a></div></body></html>`);
});

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 全局 404 处理
app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

// 全局错误处理中间件 - 不暴露内部错误信息
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // CORS 错误
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, message: '请求来源不被允许' });
  }
  // Multer 文件上传错误
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: '文件大小超出限制' });
    }
    return res.status(400).json({ success: false, message: '文件上传失败' });
  }
  // 频率限制错误
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: '请求数据过大' });
  }
  // JSON 解析错误
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: '请求数据格式错误' });
  }

  // 记录内部错误日志（不输出给客户端）
  console.error('[Error]', err.stack || err.message);

  // 生产环境不暴露错误详情
  const message = config.isDev
    ? err.message
    : '服务器内部错误，请稍后再试';

  res.status(err.status || 500).json({ success: false, message });
});

// 启动服务器
async function start() {
  try {
    await initDatabase();
    console.log(`数据库连接成功`);

    // 启动订单超时自动取消定时任务（每5分钟检查一次）
    startOrderExpiryTask();

    app.listen(config.port, () => {
      console.log(`服务器运行在 http://localhost:${config.port}`);
      console.log(`上传目录: ${path.join(process.cwd(), config.uploadDir)}`);
      console.log(`管理后台: http://localhost:${config.port}/admin`);
    });
  } catch (err) {
    console.error('启动失败:', err);
    process.exit(1);
  }
}

/** 订单超时自动取消（每5分钟执行） */
function startOrderExpiryTask() {
  const CHECK_INTERVAL = 5 * 60 * 1000; // 5 分钟

  const checkExpiredOrders = async () => {
    try {
      const db = await import('./db');
      const [expired] = await db.query(
        `SELECT id FROM orders WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < NOW() LIMIT 100`
      ) as any;
      if (expired && expired.length > 0) {
        const ids = expired.map((r: any) => r.id);
        await db.query(
          `UPDATE orders SET status = 'cancelled' WHERE id IN (?) AND status = 'pending'`,
          [ids]
        );
      }
    } catch (err) {
      console.error('[OrderExpiry] 检查过期订单失败:', err);
    }
  };

  // 首次延迟30秒后执行，之后每5分钟执行
  setTimeout(() => {
    checkExpiredOrders();
    setInterval(checkExpiredOrders, CHECK_INTERVAL);
  }, 30000);
}

start();

export default app;
