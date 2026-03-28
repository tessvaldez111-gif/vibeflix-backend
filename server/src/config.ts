import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

export const config = {
  nodeEnv,
  port: parseInt(process.env.PORT || '3000', 10),
  serverUrl: process.env.SERVER_URL || `http://localhost:${process.env.PORT || '3000'}`,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'drama_platform',
  },
  uploadDir: process.env.UPLOAD_DIR || '../uploads',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'CHANGE-THIS-IN-PRODUCTION',
  isDev: nodeEnv === 'development',
  // 腾讯云 COS 配置
  cos: {
    bucket: process.env.COS_BUCKET || '',
    region: process.env.COS_REGION || 'ap-singapore',
    secretId: process.env.COS_SECRET_ID || '',
    secretKey: process.env.COS_SECRET_KEY || '',
  },
};
