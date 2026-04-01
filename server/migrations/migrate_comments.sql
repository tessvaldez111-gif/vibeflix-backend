-- ===== Comments & Danmaku & Ad Rewards Migration =====
-- Run this on the production database

-- 1. Comments table
CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  drama_id INT NOT NULL,
  episode_id INT DEFAULT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  like_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_drama_id (drama_id),
  INDEX idx_episode_id (episode_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Comment likes table
CREATE TABLE IF NOT EXISTS comment_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comment_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_comment_user (comment_id, user_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Danmaku (bullet comments) table
CREATE TABLE IF NOT EXISTS danmaku (
  id INT AUTO_INCREMENT PRIMARY KEY,
  drama_id INT NOT NULL,
  episode_id INT NOT NULL,
  user_id INT NOT NULL,
  content VARCHAR(100) NOT NULL,
  time DECIMAL(8,2) NOT NULL COMMENT 'Time in seconds when danmaku should appear',
  color VARCHAR(20) DEFAULT '#FFFFFF',
  position TINYINT DEFAULT 0 COMMENT '0=top, 1=center, 2=bottom',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_drama_episode (drama_id, episode_id),
  INDEX idx_episode_time (episode_id, time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Ad reward records table
CREATE TABLE IF NOT EXISTS ad_reward_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  drama_id INT NOT NULL,
  episode_id INT NOT NULL,
  reward_points INT DEFAULT 20,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Add ad_reward_points setting
INSERT INTO system_settings (`key`, `value`, description`) VALUES
('ad_reward_points', '20', 'Points earned per ad watch')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

-- 6. Add daily_ad_reward_limit setting
INSERT INTO system_settings (`key`, `value`, description) VALUES
('daily_ad_reward_limit', '20', 'Max ad rewards per day per user')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
