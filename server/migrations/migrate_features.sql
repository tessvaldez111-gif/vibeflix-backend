-- ============================================
-- 签到增强 + 分享邀请 + VIP 会员 功能迁移
-- ============================================

-- 1. 签到记录表（支持连续签到追踪）
CREATE TABLE IF NOT EXISTS user_signin_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  signin_date DATE NOT NULL,
  streak_days INT NOT NULL DEFAULT 1,
  points_earned INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_date (user_id, signin_date),
  KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. 用户表新增字段：分享码 + 邀请人
ALTER TABLE users ADD COLUMN share_code VARCHAR(16) DEFAULT NULL UNIQUE;
ALTER TABLE users ADD COLUMN inviter_id INT DEFAULT NULL;
ALTER TABLE users ADD KEY idx_inviter_id (inviter_id);

-- 3. 用户表新增字段：VIP 会员
ALTER TABLE users ADD COLUMN vip_level TINYINT NOT NULL DEFAULT 0 COMMENT 'VIP等级: 0=非会员, 1/2/3=不同等级';
ALTER TABLE users ADD COLUMN vip_expire_at DATETIME DEFAULT NULL COMMENT 'VIP到期时间';

-- 4. 分享记录表
CREATE TABLE IF NOT EXISTS share_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  drama_id INT DEFAULT NULL COMMENT '分享的短剧ID',
  share_type ENUM('drama', 'invite_link') NOT NULL DEFAULT 'drama',
  click_count INT NOT NULL DEFAULT 0 COMMENT '被点击次数',
  reward_given TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已发放奖励',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_id (user_id),
  KEY idx_drama_id (drama_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. 邀请奖励记录表
CREATE TABLE IF NOT EXISTS invite_rewards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inviter_id INT NOT NULL COMMENT '邀请人ID',
  invitee_id INT NOT NULL COMMENT '被邀请人ID',
  reward_points INT NOT NULL DEFAULT 0 COMMENT '奖励积分',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_invitee (invitee_id),
  KEY idx_inviter (inviter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. VIP 套餐表
CREATE TABLE IF NOT EXISTS vip_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL COMMENT '套餐名称',
  duration_days INT NOT NULL COMMENT '有效天数',
  price DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '价格(USD)',
  original_price DECIMAL(10,2) DEFAULT NULL COMMENT '原价(划线价)',
  free_episodes INT NOT NULL DEFAULT 0 COMMENT 'VIP免费集数(每部剧)',
  points_bonus INT NOT NULL DEFAULT 0 COMMENT '每日签到积分加成',
  features TEXT COMMENT '特权描述(JSON数组)',
  sort_order INT NOT NULL DEFAULT 0,
  is_hot TINYINT(1) NOT NULL DEFAULT 0 COMMENT '热门标记',
  status TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=上架 0=下架',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. VIP 订单表
CREATE TABLE IF NOT EXISTS vip_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_no VARCHAR(50) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,
  duration_days INT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  status ENUM('pending', 'paid', 'cancelled', 'expired') NOT NULL DEFAULT 'pending',
  payment_id VARCHAR(100) DEFAULT NULL COMMENT 'PayPal订单ID',
  old_expire_at DATETIME DEFAULT NULL COMMENT '续费前的到期时间',
  new_expire_at DATETIME NOT NULL COMMENT '续费后的到期时间',
  vip_level INT NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at DATETIME DEFAULT NULL,
  KEY idx_user_id (user_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. 新增系统设置
INSERT INTO system_settings (`key`, `value`, `description`) VALUES
('signin_streak_bonus', '{"1":5,"2":5,"3":5,"4":5,"5":5,"6":5,"7":15,"14":20,"30":50}', '连续签到奖励阶梯(streak_days: bonus_points)'),
('share_reward_points', '10', '每次分享奖励积分'),
('daily_share_limit', '5', '每日分享上限次数'),
('invite_reward_points', '50', '邀请注册奖励积分'),
('vip_enabled', 'true', 'VIP功能开关'),
('vip_signin_bonus', '5', 'VIP每日签到额外积分')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- 9. 插入默认 VIP 套餐
INSERT INTO vip_plans (name, duration_days, price, original_price, free_episodes, points_bonus, features, sort_order, is_hot, status) VALUES
('周卡会员', 7, 2.99, 4.99, 10, 5, '["每日签到双倍积分","每部剧前10集免费","VIP专属标识"]', 1, 0, 1),
('月卡会员', 30, 9.99, 14.99, 0, 10, '["每日签到双倍积分","全部剧集免费观看","VIP专属标识","专属客服"]', 2, 1, 1),
('季卡会员', 90, 24.99, 39.99, 0, 15, '["每日签到三倍积分","全部剧集免费观看","VIP专属标识","专属客服","优先观看新剧"]', 3, 0, 1),
('年卡会员', 365, 79.99, 149.99, 0, 20, '["每日签到三倍积分","全部剧集免费观看","VIP专属标识","专属客服","优先观看新剧","生日特权"]', 4, 0, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 10. 为现有用户生成分享码
-- 使用用户ID后8位 + 随机4位十六进制（如果 share_code 为空）
UPDATE users u
JOIN (
  SELECT id, LPAD(HEX(id), 8, '0') AS base_code
  FROM users WHERE share_code IS NULL
) t ON u.id = t.id
SET u.share_code = CONCAT(t.base_code, SUBSTRING(MD5(RAND()), 1, 4))
WHERE u.share_code IS NULL;
