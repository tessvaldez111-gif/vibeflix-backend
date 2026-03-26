# 🎬 短剧观看平台

一个完整的短剧上传、管理与在线观看平台。

## 📁 项目结构

```
short-drama-platform/
├── client/                    # 前端（观众看短剧）
│   ├── src/
│   │   ├── App.tsx            # 根组件
│   │   ├── App.css            # 全局样式
│   │   ├── pages/
│   │   │   ├── Home.tsx       # 首页（短剧列表 + 搜索 + 分类筛选）
│   │   │   └── Player.tsx     # 播放页（视频播放 + 选集）
│   │   ├── services/
│   │   │   └── api.ts         # API 请求封装
│   │   └── hooks/
│   │       └── useUtils.ts    # 自定义 Hooks
│   └── package.json
│
├── server/                    # 后端（管理 + API）
│   ├── src/
│   │   ├── index.ts           # 服务器入口
│   │   ├── config.ts          # 配置文件
│   │   ├── db.ts              # 数据库连接池
│   │   ├── models/            # 数据库模型层
│   │   │   ├── Drama.ts       # 短剧 + 剧集模型
│   │   │   ├── User.ts        # 用户模型
│   │   │   └── index.ts       # 统一导出
│   │   ├── routes/            # API 路由
│   │   │   ├── drama.ts       # 短剧 CRUD 路由
│   │   │   ├── auth.ts        # 认证 & 仪表板路由
│   │   │   └── upload.ts      # 文件上传路由
│   │   └── scripts/
│   │       └── init.sql       # 数据库初始化脚本
│   ├── public/
│   │   └── admin.html         # 管理后台（单页面）
│   ├── .env                   # 环境变量配置
│   ├── tsconfig.json
│   └── package.json
│
└── uploads/                   # 视频存储（运行时自动创建）
    ├── videos/                # 视频文件
    └── covers/                # 封面图片
```

## 🚀 快速开始

### 1. 环境要求

- **Node.js** >= 18
- **MySQL** >= 5.7
- **npm** >= 9

### 2. 初始化数据库

```sql
mysql -u root -p < server/src/scripts/init.sql
```

### 3. 配置后端

编辑 `server/.env`，修改数据库连接信息：

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=drama_platform
UPLOAD_DIR=../uploads
CLIENT_URL=http://localhost:5173
```

### 4. 启动后端

```bash
cd server
npm install
npm run dev
```

### 5. 启动前端

```bash
cd client
npm install
npm run dev
```

## 📖 访问地址

| 页面 | 地址 |
|------|------|
| 观众端 | http://localhost:5173 |
| 管理后台 | http://localhost:3000/admin |

**管理员账号：** admin / admin123

## ✅ 功能

### 观众端
- 🏠 短剧卡片列表，分页展示
- 🔍 关键词实时搜索
- 🏷️ 分类标签筛选
- ▶️ 视频在线播放
- 📋 选集列表，自动播放下一集

### 管理后台
- 📊 数据概览仪表板
- 🎞️ 短剧增删改查
- 🖼️ 封面图片上传
- 📤 剧集视频上传
- 📋 剧集管理（查看/删除）

### 技术架构
- **分层设计**：Routes → Models → DB，数据库查询与 API 路由解耦
- **TypeScript**：前后端全量类型定义
- **文件上传**：Multer，支持 500MB 视频 + 10MB 封面
