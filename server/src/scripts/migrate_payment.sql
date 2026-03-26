-- ============================================================
-- 短剧平台 - 订单、支付、积分系统 数据库迁移脚本
-- 执行方法：mysql -u root drama_platform < server/src/scripts/migrate_payment.sql
-- ============================================================

USE drama_platform;

-- --------------------------------------------------
-- 1. 用户积分表
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS user_points (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '用户ID',
  balance INT DEFAULT 0 COMMENT '积分余额',
  total_earned INT DEFAULT 0 COMMENT '累计获得积分',
  total_spent INT DEFAULT 0 COMMENT '累计消费积分',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户积分表';

-- 为现有用户初始化积分记录
INSERT IGNORE INTO user_points (user_id, balance, total_earned)
SELECT id, 0, 0 FROM users;

-- --------------------------------------------------
-- 2. 积分流水表
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS points_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '用户ID',
  type ENUM('earn', 'spend', 'refund', 'admin_add', 'admin_subtract') NOT NULL COMMENT '类型：获得/消费/退款/管理员增加/管理员扣减',
  amount INT NOT NULL COMMENT '积分变动数量（正数）',
  balance_after INT NOT NULL COMMENT '变动后余额',
  source VARCHAR(50) COMMENT '来源：recharge/signin/watch/share/admin/admin_refund',
  source_id VARCHAR(100) COMMENT '来源ID（如订单号）',
  description VARCHAR(200) COMMENT '描述',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_type (type),
  INDEX idx_created (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='积分流水表';

-- --------------------------------------------------
-- 3. 充值套餐表
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS recharge_packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '套餐名称',
  points INT NOT NULL COMMENT '积分数量',
  price DECIMAL(10,2) NOT NULL COMMENT '价格（USD）',
  bonus_points INT DEFAULT 0 COMMENT '赠送积分',
  sort_order INT DEFAULT 0 COMMENT '排序',
  status TINYINT DEFAULT 1 COMMENT '0禁用 1启用',
  is_hot TINYINT DEFAULT 0 COMMENT '0普通 1热门推荐',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='充值套餐表';

-- 预置充值套餐
INSERT INTO recharge_packages (name, points, price, bonus_points, sort_order, is_hot) VALUES
('体验包', 100, 1.99, 10, 1, 0),
('基础包', 500, 8.99, 50, 2, 0),
('超值包', 1200, 19.99, 200, 3, 1),
('豪华包', 3000, 49.99, 600, 4, 0),
('至尊包', 6000, 89.99, 1500, 5, 0);

-- --------------------------------------------------
-- 4. 订单表
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_no VARCHAR(64) NOT NULL COMMENT '订单号',
  user_id INT NOT NULL COMMENT '用户ID',
  type ENUM('recharge', 'purchase') NOT NULL DEFAULT 'recharge' COMMENT '订单类型：充值/购买剧集',
  status ENUM('pending', 'paid', 'failed', 'refunded', 'cancelled') DEFAULT 'pending' COMMENT '订单状态',
  payment_method VARCHAR(30) DEFAULT 'paypal' COMMENT '支付方式',
  payment_id VARCHAR(200) COMMENT '第三方支付ID（如PayPal payment ID）',
  
  -- 充值相关
  package_id INT DEFAULT NULL COMMENT '充值套餐ID',
  points_amount INT DEFAULT 0 COMMENT '充值获得的积分',
  
  -- 购买相关
  drama_id INT DEFAULT NULL COMMENT '短剧ID',
  episode_id INT DEFAULT NULL COMMENT '剧集ID',
  points_cost INT DEFAULT 0 COMMENT '消耗的积分',
  
  -- 金额
  total_amount DECIMAL(10,2) DEFAULT 0 COMMENT '支付金额（USD）',
  currency VARCHAR(10) DEFAULT 'USD' COMMENT '货币',
  
  -- 时间
  paid_at TIMESTAMP NULL COMMENT '支付时间',
  expires_at TIMESTAMP NULL COMMENT '过期时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_order_no (order_no),
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_payment_id (payment_id),
  INDEX idx_created (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES recharge_packages(id) ON DELETE SET NULL,
  FOREIGN KEY (drama_id) REFERENCES dramas(id) ON DELETE SET NULL,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- --------------------------------------------------
-- 5. 支付记录表
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL COMMENT '订单ID',
  payment_no VARCHAR(200) NOT NULL COMMENT '第三方支付单号',
  payment_method VARCHAR(30) NOT NULL DEFAULT 'paypal' COMMENT '支付方式：paypal等',
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending' COMMENT '支付状态',
  amount DECIMAL(10,2) NOT NULL COMMENT '支付金额',
  currency VARCHAR(10) DEFAULT 'USD' COMMENT '货币',
  payer_email VARCHAR(200) COMMENT '付款人邮箱',
  payer_id VARCHAR(200) COMMENT '付款人ID',
  
  -- PayPal 专属字段
  paypal_capture_id VARCHAR(200) COMMENT 'PayPal capture ID',
  paypal_order_id VARCHAR(200) COMMENT 'PayPal order ID',
  
  raw_response JSON COMMENT '原始响应数据（调试用）',
  paid_at TIMESTAMP NULL COMMENT '支付完成时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_payment_no (payment_no),
  INDEX idx_order (order_id),
  INDEX idx_status (status),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付记录表';

-- --------------------------------------------------
-- 6. 系统设置表
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS system_settings (
  `key` VARCHAR(100) PRIMARY KEY COMMENT '设置键名',
  value TEXT COMMENT '设置值',
  description VARCHAR(200) COMMENT '设置说明',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统设置表';

-- 预置设置
INSERT INTO system_settings (`key`, value, description) VALUES
('paypal_enabled', 'false', 'PayPal支付开关：true/false'),
('paypal_client_id', '', 'PayPal Client ID'),
('paypal_client_secret', '', 'PayPal Client Secret'),
('paypal_mode', 'sandbox', 'PayPal模式：sandbox/live'),
('points_per_recharge', '1', '每消费1美元获得的积分'),
('points_per_episode', '10', '解锁一集需要的积分数'),
('register_bonus_points', '50', '新用户注册赠送积分'),
('daily_signin_points', '5', '每日签到赠送积分'),
('free_episode_count', '3', '每部剧免费集数'),
('site_name', '短剧平台', '站点名称');
