# 海外短剧平台 App - 框架设计文档

> 基于 React Native + Expo，一套代码同时发布 iOS 和 Android

---

## 一、技术选型对比与决策

| 维度 | React Native + Expo (推荐) | Flutter | 原生开发 (Swift/Kotlin) |
|------|---------------------------|---------|----------------------|
| 跨平台 | iOS + Android 一套代码 | iOS + Android 一套代码 | 需要分别开发 |
| 与现有项目契合度 | 高 (React 生态复用) | 低 (Dart 语言) | 低 (完全重写) |
| 学习成本 | 低 (已有 React 经验) | 高 (新语言) | 高 (两套语言) |
| 视频播放 | react-native-video (成熟) | video_player (成熟) | AVPlayer / ExoPlayer |
| 支付集成 | PayPal SDK / Stripe SDK | 相同 | 相同 |
| 上架审核 | 正常 | 正常 | 最容易 |
| 开发速度 | 快 | 中 | 慢 |
| 性能 | 接近原生 | 接近原生 | 原生 |
| 热更新 | Expo OTA | 不支持 | 不支持 |

**决策：React Native + Expo**，理由：
1. 团队已有 React/TypeScript 经验，学习成本最低
2. 现有 Web 端的 API 接口、类型定义可大量复用
3. Expo 生态成熟，视频播放、支付、推送等都有成熟的库
4. 支持 Expo OTA 热更新，海外合规审核通过后可快速迭代

---

## 二、整体架构

```
┌─────────────────────────────────────────────────┐
│                   Mobile App                     │
│              (React Native + Expo)               │
│  ┌─────────┐ ┌──────────┐ ┌─────────────────┐  │
│  │  Pages  │ │Components│ │  Services/API   │  │
│  └────┬────┘ └────┬─────┘ └────────┬────────┘  │
│       │           │                 │            │
│  ┌────┴───────────┴─────────────────┴────────┐  │
│  │          State Management (Zustand)        │  │
│  └────────────────────┬──────────────────────┘  │
│                       │                          │
│  ┌────────────────────┴──────────────────────┐  │
│  │         API Layer (Axios + JWT Auth)       │  │
│  └────────────────────┬──────────────────────┘  │
└───────────────────────┼─────────────────────────┘
                        │ HTTPS
┌───────────────────────┼─────────────────────────┐
│              Existing Backend (Express)          │
│  ┌──────────┐ ┌────────┐ ┌────────────────┐    │
│  │  Auth    │ │ Drama  │ │ Payment (PayPal│    │
│  │  JWT     │ │ CRUD   │ │  + Stripe)     │    │
│  └──────────┘ └────────┘ └────────────────┘    │
│  ┌──────────┐ ┌────────┐ ┌────────────────┐    │
│  │  Points  │ │ Orders │ │    Admin       │    │
│  └──────────┘ └────────┘ └────────────────┘    │
└─────────────────────────────────────────────────┘
```

**关键原则：**
- **后端复用**：现有 Express 后端 80%+ 的 API 可直接使用，仅需少量适配
- **API 复用**：现有 `client/src/services/api.ts` 的接口定义可移植到 RN 端
- **海外适配**：在 App 端处理多语言、多币种、多支付方式

---

## 三、项目目录结构

```
app/                              # React Native App 根目录
├── app.json                      # Expo 配置
├── eas.json                      # EAS Build 配置 (构建云服务)
├── package.json
├── tsconfig.json
├── babel.config.js
│
├── src/
│   ├── App.tsx                   # App 入口 (路由配置)
│   │
│   ├── screens/                  # 页面
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx       # 登录页
│   │   │   ├── RegisterScreen.tsx    # 注册页
│   │   │   └── ForgotPassword.tsx    # 忘记密码 (新增，海外需要)
│   │   │
│   │   ├── home/
│   │   │   ├── HomeScreen.tsx        # 首页 (Banner + 分类 + 推荐)
│   │   │   ├── CategoryScreen.tsx    # 分类列表页
│   │   │   ├── SearchScreen.tsx      # 搜索页
│   │   │   └── FeaturedScreen.tsx    # 精选/排行榜
│   │   │
│   │   ├── drama/
│   │   │   ├── DramaDetailScreen.tsx # 短剧详情页
│   │   │   └── PlayerScreen.tsx      # 视频播放页 (全屏)
│   │   │
│   │   ├── user/
│   │   │   ├── ProfileScreen.tsx     # 个人中心
│   │   │   ├── WatchHistoryScreen.tsx # 观看历史
│   │   │   ├── FavoritesScreen.tsx   # 我的收藏
│   │   │   └── SettingsScreen.tsx    # 设置页
│   │   │
│   │   ├── wallet/
│   │   │   ├── WalletScreen.tsx      # 钱包 (积分+余额)
│   │   │   ├── RechargeScreen.tsx    # 充值页
│   │   │   └── TransactionScreen.tsx # 交易记录
│   │   │
│   │   └── tabs/
│   │       ├── HomeTab.tsx           # 底部 Tab - 首页
│   │       ├── CategoryTab.tsx       # 底部 Tab - 分类
│   │       ├── WalletTab.tsx         # 底部 Tab - 钱包
│   │       └── ProfileTab.tsx        # 底部 Tab - 我的
│   │
│   ├── components/               # 可复用组件
│   │   ├── ui/                   # 基础 UI 组件
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── EmptyState.tsx
│   │   │
│   │   ├── drama/                # 短剧相关组件
│   │   │   ├── DramaCard.tsx        # 短剧卡片 (列表项)
│   │   │   ├── DramaCarousel.tsx    # 横向轮播 (首页推荐)
│   │   │   ├── EpisodeList.tsx      # 选集列表
│   │   │   ├── VideoPlayer.tsx      # 视频播放器封装
│   │   │   └── DramaBadge.tsx       # 标签 (连载/完结/免费/付费)
│   │   │
│   │   ├── auth/                 # 认证相关组件
│   │   │   ├── AuthForm.tsx
│   │   │   └── SocialLogin.tsx      # Google/Apple/Facebook 登录
│   │   │
│   │   ├── payment/              # 支付相关组件
│   │   │   ├── RechargePackage.tsx  # 充值套餐卡片
│   │   │   ├── PaymentSheet.tsx     # 支付底部弹出面板
│   │   │   └── PointsBadge.tsx      # 积分角标
│   │   │
│   │   └── layout/               # 布局组件
│   │       ├── TabBar.tsx           # 底部导航栏
│   │       ├── Header.tsx           # 顶部导航栏
│   │       └── BottomSheet.tsx      # 底部弹出面板
│   │
│   ├── services/                 # 服务层 (API 调用)
│   │   ├── api.ts                # Axios 实例 + 拦截器 + JWT 自动刷新
│   │   ├── auth.service.ts       # 认证相关 API
│   │   ├── drama.service.ts      # 短剧相关 API
│   │   ├── interaction.service.ts # 收藏/历史 API
│   │   ├── payment.service.ts    # 支付/充值 API
│   │   ├── points.service.ts     # 积分 API
│   │   └── user.service.ts       # 用户信息 API
│   │
│   ├── stores/                   # 状态管理 (Zustand)
│   │   ├── authStore.ts          # 用户认证状态
│   │   ├── dramaStore.ts         # 短剧列表缓存
│   │   ├── playerStore.ts        # 播放器状态 (当前剧集/进度)
│   │   └── walletStore.ts        # 钱包/积分状态
│   │
│   ├── hooks/                    # 自定义 Hooks
│   │   ├── useAuth.ts            # 认证 Hook
│   │   ├── useDramas.ts          # 短剧列表 Hook
│   │   ├── usePlayer.ts          # 播放器 Hook
│   │   ├── usePoints.ts          # 积分 Hook
│   │   ├── useDebounce.ts        # 防抖
│   │   ├── usePagination.ts      # 分页
│   │   └── useNetworkStatus.ts   # 网络状态
│   │
│   ├── i18n/                     # 国际化
│   │   ├── index.ts              # i18n 配置
│   │   ├── en.json               # 英文
│   │   ├── es.json               # 西班牙文 (拉美)
│   │   ├── pt.json               # 葡萄牙文 (巴西)
│   │   ├── ja.json               # 日文
│   │   └── ko.json               # 韩文
│   │
│   ├── utils/                    # 工具函数
│   │   ├── currency.ts           # 多币种处理
│   │   ├── format.ts             # 格式化 (时间/数字)
│   │   ├── storage.ts            # SecureStorage 封装
│   │   └── constants.ts          # 常量定义
│   │
│   ├── assets/                   # 静态资源
│   │   ├── images/
│   │   ├── fonts/
│   │   └── animations/
│   │
│   └── types/                    # TypeScript 类型定义
│       ├── drama.ts              # 短剧/剧集类型
│       ├── user.ts               # 用户类型
│       ├── order.ts              # 订单类型
│       └── api.ts                # API 响应类型
│
├── assets/                       # Expo 静态资源
│   ├── fonts/
│   ├── icons/
│   └── images/
│
└── plugins/                      # Expo 自定义原生插件 (如需要)
    └── withIosPayment.json
```

---

## 四、核心技术栈

### 4.1 基础框架

| 技术 | 版本 | 用途 |
|------|------|------|
| React Native | 0.76+ | 跨平台框架 |
| Expo SDK | 52+ | 开发工具链 |
| TypeScript | 5.x | 类型安全 |
| Expo Router | v4 | 文件系统路由 (可选) |
| React Navigation | v7 | 页面导航 + Tab 导航 |

### 4.2 状态管理 & 数据

| 技术 | 用途 |
|------|------|
| Zustand | 全局状态管理 (轻量，替代 Redux) |
| Axios | HTTP 请求 + 拦截器 |
| MMKV (react-native-mmkv) | 本地存储 (替代 AsyncStorage，性能更好) |
| Expo SecureStore | Token 安全存储 |

### 4.3 UI 组件库

| 技术 | 用途 |
|------|------|
| React Native Paper (Material 3) | 主要 UI 组件库，海外用户熟悉 Material Design |
| React Native Skia | 动画和高级图形 |
| React Native Reanimated | 流畅动画 |
| React Native Gesture Handler | 手势交互 |
| React Native FastImage | 图片缓存加载 |
| React Native Flash List | 高性能列表 (替代 FlatList) |

### 4.4 视频 & 媒体

| 技术 | 用途 |
|------|------|
| react-native-video | 视频播放核心 |
| expo-av | 备选视频播放方案 |
| expo-screen-orientation | 播放时旋转屏幕 |
| react-native-keep-awake | 播放时保持屏幕常亮 |

### 4.5 支付 (海外)

| 技术 | 用途 |
|------|------|
| Stripe React Native | 信用卡支付 (主要) |
| PayPal RN SDK | PayPal 支付 |
| Google Play Billing | Android 订阅/内购 |
| StoreKit 2 (expo) | iOS 内购 |
| RevenueCat | 内购管理统一封装 (推荐) |

### 4.6 推送通知

| 技术 | 用途 |
|------|------|
| expo-notifications | 推送通知 |
| Firebase Cloud Messaging | Android 推送 |
| Apple Push Notification Service | iOS 推送 |

### 4.7 国际化

| 技术 | 用途 |
|------|------|
| i18next + react-i18next | 多语言框架 |
| expo-localization | 获取系统语言 |
| Intl API | 多币种/日期格式化 |

### 4.8 分析 & 监控

| 技术 | 用途 |
|------|------|
| Firebase Analytics | 用户行为分析 |
| Sentry | 崩溃监控 |
| Amplitude / Mixpanel | 留存分析 (可选) |

---

## 五、后端适配 (基于现有 Express 后端)

### 5.1 直接复用的 API (无需修改)

| API | 说明 |
|-----|------|
| `GET /api/dramas` | 短剧列表 |
| `GET /api/dramas/:id` | 短剧详情 |
| `GET /api/dramas/:dramaId/episodes/:episodeNumber` | 剧集信息 |
| `GET /api/genres` | 分类列表 |
| `GET /api/categories` | 分类列表 |
| `POST /api/users/register` | 用户注册 |
| `POST /api/users/login` | 用户登录 |
| `GET /api/users/me` | 用户信息 |
| `POST /api/history` | 观看历史 |
| `GET /api/history` | 获取历史 |
| `POST /api/favorite` | 收藏/喜欢 |
| `DELETE /api/favorite` | 取消收藏 |
| `GET /api/favorites` | 收藏列表 |
| `GET /api/points/my` | 积分余额 |
| `POST /api/points/signin` | 每日签到 |
| `GET /api/recharge/packages` | 充值套餐 |
| `GET /api/health` | 健康检查 |

### 5.2 需要新增/修改的 API

| API | 说明 | 修改内容 |
|-----|------|---------|
| **新增** `POST /api/users/social-login` | 第三方登录 | 支持 Google/Apple/Facebook OAuth |
| **新增** `POST /api/users/phone-login` | 手机号登录 (海外) | 支持 SMS 验证码 (Twilio/FCM) |
| **修改** `POST /api/payment/paypal/create` | PayPal 适配 | 添加移动端 deep link / redirect |
| **修改** `POST /api/payment/paypal/capture` | 支付捕获 | 适配移动端回调 |
| **新增** `POST /api/payment/stripe/create` | Stripe 支付 | 新增 Stripe PaymentIntent |
| **新增** `POST /api/payment/stripe/confirm` | Stripe 确认 | 确认 PaymentIntent |
| **新增** `POST /api/payment/apple/verify` | Apple IAP 验证 | 验证 App Store 收据 |
| **新增** `POST /api/payment/google/verify` | Google IAP 验证 | 验证 Google Play 收据 |
| **新增** `POST /api/device/register` | 设备注册 | 注册推送 Token |
| **新增** `GET /api/dramas/featured` | 推荐列表 | 运营推荐位 (Banner/编辑推荐) |
| **新增** `GET /api/dramas/trending` | 热门排行 | 按播放量/收藏量排序 |
| **修改** `POST /api/users/register` | 国际化注册 | 支持邮箱/手机号/第三方账号注册 |
| **修改** `system_settings` | 多币种支持 | 新增 currency、默认语言等设置 |

### 5.3 数据库新增表

```sql
-- 第三方登录表
CREATE TABLE IF NOT EXISTS social_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  provider ENUM('google', 'apple', 'facebook', 'phone') NOT NULL,
  provider_id VARCHAR(200) NOT NULL COMMENT '第三方用户ID',
  provider_email VARCHAR(200) COMMENT '第三方邮箱',
  access_token TEXT COMMENT '访问令牌',
  refresh_token TEXT COMMENT '刷新令牌',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_provider (provider, provider_id),
  INDEX idx_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 设备推送表
CREATE TABLE IF NOT EXISTS devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  platform ENUM('ios', 'android') NOT NULL,
  device_token VARCHAR(500) NOT NULL COMMENT 'FCM/APNs Token',
  device_id VARCHAR(200) COMMENT '设备唯一标识',
  app_version VARCHAR(50),
  os_version VARCHAR(50),
  is_active TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 短剧推荐位表
CREATE TABLE IF NOT EXISTS featured_dramas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  drama_id INT NOT NULL,
  position ENUM('banner', 'recommend', 'trending', 'new_release') NOT NULL,
  sort_order INT DEFAULT 0,
  start_at TIMESTAMP NULL COMMENT '开始展示时间',
  end_at TIMESTAMP NULL COMMENT '结束展示时间',
  status TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (drama_id) REFERENCES dramas(id) ON DELETE CASCADE,
  UNIQUE KEY uk_drama_position (drama_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 多语言短剧表 (翻译信息)
CREATE TABLE IF NOT EXISTS drama_translations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  drama_id INT NOT NULL,
  locale VARCHAR(10) NOT NULL COMMENT '语言代码: en, es, pt, ja, ko',
  title VARCHAR(200) COMMENT '翻译标题',
  description TEXT COMMENT '翻译简介',
  tags JSON COMMENT '翻译标签',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_drama_locale (drama_id, locale),
  FOREIGN KEY (drama_id) REFERENCES dramas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 六、海外适配要点

### 6.1 多语言 (i18n)

支持语言 (Phase 1):
- English (en) - 默认
- Español (es) - 拉美市场
- Português (pt) - 巴西市场
- 日本語 (ja) - 日本市场
- 한국어 (ko) - 韩国市场

翻译范围: UI 文案、短剧标题和简介 (通过 drama_translations 表)、错误提示、支付相关文案

### 6.2 多币种

支持币种: USD ($), EUR (€), GBP (£), BRL (R$), JPY (¥), KRW (₩)
实现: 用户注册时根据 IP/地区自动选择，钱包页面可手动切换，后端订单表已有 currency 字段可复用

### 6.3 多支付方式

iOS: Apple IAP (内购) + Stripe (信用卡) + PayPal
Android: Google Play Billing (内购) + Stripe + PayPal + Google Pay
Web (已有): PayPal + Stripe (新增)

### 6.4 第三方登录

Google Sign-In (最重要) + Apple Sign-In (iOS 必须) + Facebook Login + Email/Password + Phone SMS (可选)

### 6.5 合规要求

GDPR (欧洲)、COPPA (美国)、Apple/Google 商店政策、CCPA (加州)
需准备: Privacy Policy、Terms of Service、Cookie Policy、Refund Policy

### 6.6 内容分发

视频: AWS S3 + CloudFront CDN (多区域: 美/欧/东南亚/日韩)
格式: HLS (.m3u8) 优先，自适应码率 480p/720p/1080p

---

## 七、页面路由设计

```
App 启动 → Splash → [未登录: Onboarding → Login] / [已登录: Main]

Main (Tab 导航):
  Tab 1 - Home:    Banner轮播 / Continue Watching / 分类滑动 / 热门推荐 / 新上线
  Tab 2 - Explore: 搜索 / 分类标签 / 排行榜 / 短剧网格
  Tab 3 - Wallet:  积分余额 / 每日签到 / 充值入口 / 交易记录
  Tab 4 - Profile: 头像昵称 / 观看历史 / 收藏 / 已购 / 设置 / 关于

DramaDetail: 封面+播放 / 标题评分 / 简介 / 收藏喜欢 / 选集列表 / 相似推荐
Player:        全屏播放 / 手势控制 / 横屏旋转 / 播放结束下一集
```

---

## 八、开发里程碑

Phase 1 MVP (4-6周): 框架搭建 + 核心页面 + 登录注册 + 视频播放 + 积分 + PayPal
Phase 2 上线 (3-4周): Stripe + Apple/Google IAP + 推送 + HLS优化 + 性能优化 + 提审
Phase 3 迭代: 社交分享 / 订阅制 / 离线缓存 / AI推荐 / 评论 / 弹幕

---

## 九、成本估算

| 项目 | 费用 |
|------|------|
| Apple Developer | $99/年 |
| Google Play | $25/一次性 |
| AWS S3 + CloudFront | $50-200/月 |
| Sentry / RevenueCat / Firebase | 免费额度 |
| Twilio SMS | $0.05/条 |
| **月运营成本** | **~$150-300/月** |

---

## 十、风险与对策

| 风险 | 对策 |
|------|------|
| App Store 审核被拒 | 提前阅读指南，确保 IAP 合规 |
| 海外视频 CDN 延迟 | 多区域 CDN + HLS 自适应 |
| 支付欺诈 | Stripe Radar + 风控规则 |
| 苹果抽成 30% | 推 Web 端充值 (0% 抽成) |
| 版权问题 | 内容授权 + DMCA 流程 |
