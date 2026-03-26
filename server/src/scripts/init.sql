-- ============================================================
-- 短剧观看平台 数据库初始化脚本
-- 使用方法：mysql -u root -p < server/src/scripts/init.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS drama_platform 
  DEFAULT CHARACTER SET utf8mb4 
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE drama_platform;

-- --------------------------------------------------
-- 1. 分类表
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL COMMENT '分类名称',
  icon VARCHAR(100) COMMENT '图标',
  sort_order INT DEFAULT 0 COMMENT '排序',
  status TINYINT DEFAULT 1 COMMENT '0禁用 1启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分类表';

INSERT INTO categories (name, icon, sort_order) VALUES
('都市情感', '🏙️', 1),
('悬疑推理', '🔍', 2),
('科幻奇幻', '🚀', 3),
('古装历史', '🏯', 4),
('喜剧搞笑', '😂', 5),
('动作冒险', '💥', 6),
('恐怖惊悚', '👻', 7),
('励志成长', '📈', 8);

-- --------------------------------------------------
-- 2. 用户表 (扩展)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  password VARCHAR(255) NOT NULL COMMENT '密码',
  nickname VARCHAR(50) COMMENT '昵称',
  avatar VARCHAR(500) COMMENT '头像路径',
  email VARCHAR(100) COMMENT '邮箱',
  role ENUM('admin', 'user') DEFAULT 'user' COMMENT '角色',
  status TINYINT DEFAULT 1 COMMENT '0禁用 1正常',
  last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户信息表';

-- 默认管理员
INSERT IGNORE INTO users (username, password, nickname, role) 
VALUES ('admin', 'admin123', '管理员', 'admin');

-- --------------------------------------------------
-- 3. 短剧表 (扩展)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS dramas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL COMMENT '短剧标题',
  description TEXT COMMENT '短剧简介',
  cover_image VARCHAR(500) COMMENT '封面图片路径',
  category_id INT DEFAULT NULL COMMENT '分类ID',
  genre VARCHAR(50) COMMENT '分类/标签(兼容)',
  tags JSON COMMENT '标签JSON数组',
  status ENUM('ongoing', 'completed', 'draft') DEFAULT 'ongoing' COMMENT '连载状态',
  episode_count INT DEFAULT 0 COMMENT '总集数',
  rating DECIMAL(2,1) DEFAULT 0 COMMENT '评分(0-10)',
  rating_count INT DEFAULT 0 COMMENT '评分人数',
  view_count BIGINT DEFAULT 0 COMMENT '播放次数',
  like_count INT DEFAULT 0 COMMENT '点赞数',
  collect_count INT DEFAULT 0 COMMENT '收藏数',
  release_date DATE COMMENT '发布日期',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category_id),
  INDEX idx_status (status),
  INDEX idx_view_count (view_count),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='短剧信息表';

-- --------------------------------------------------
-- 4. 剧集表 (扩展)
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS episodes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  drama_id INT NOT NULL COMMENT '所属短剧ID',
  episode_number INT NOT NULL COMMENT '集数',
  title VARCHAR(200) COMMENT '剧集标题',
  video_path VARCHAR(500) NOT NULL COMMENT '视频文件路径',
  duration INT DEFAULT 0 COMMENT '时长(秒)',
  view_count BIGINT DEFAULT 0 COMMENT '播放次数',
  is_free TINYINT DEFAULT 1 COMMENT '0付费 1免费',
  status TINYINT DEFAULT 1 COMMENT '0禁用 1启用',
  sort_order INT DEFAULT 0 COMMENT '排序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (drama_id) REFERENCES dramas(id) ON DELETE CASCADE,
  UNIQUE KEY uk_drama_episode (drama_id, episode_number),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='剧集信息表';

-- --------------------------------------------------
-- 5. 用户观看历史表
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS watch_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '用户ID',
  drama_id INT NOT NULL COMMENT '短剧ID',
  episode_id INT NOT NULL COMMENT '当前观看剧集ID',
  progress INT DEFAULT 0 COMMENT '观看进度(秒)',
  duration INT DEFAULT 0 COMMENT '总时长(秒)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_drama (user_id, drama_id),
  INDEX idx_user (user_id),
  INDEX idx_drama (drama_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (drama_id) REFERENCES dramas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户观看历史表(每部剧一条记录)';

-- --------------------------------------------------
-- 6. 用户收藏表
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '用户ID',
  drama_id INT NOT NULL COMMENT '短剧ID',
  type ENUM('favorite', 'like') DEFAULT 'favorite' COMMENT '收藏/喜欢',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_drama_type (user_id, drama_id, type),
  INDEX idx_user (user_id),
  INDEX idx_drama (drama_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (drama_id) REFERENCES dramas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户收藏表';
