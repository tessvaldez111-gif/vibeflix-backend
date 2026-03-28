import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { config } from './config';

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      idleTimeout: 60000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 30000,
      charset: 'utf8mb4',
      charsetNumber: 45, // utf8mb4
    });
  }
  return pool;
}

export async function getConnection() {
  return getPool().getConnection();
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const p = getPool();
  const [results] = await p.query(sql, params);
  return results as T;
}

export async function initDatabase(): Promise<void> {
  const p = getPool();
  const conn = await p.getConnection();
  try {
    // 创建数据库
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${config.db.database}\``);

    // 建表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        icon VARCHAR(100),
        sort_order INT DEFAULT 0,
        status TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        nickname VARCHAR(50),
        avatar VARCHAR(500) DEFAULT '',
        email VARCHAR(100),
        email_verified TINYINT DEFAULT 0,
        role VARCHAR(20) DEFAULT 'user',
        status TINYINT DEFAULT 1,
        last_login_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS dramas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        cover_image VARCHAR(500) DEFAULT '',
        category_id INT DEFAULT NULL,
        genre VARCHAR(50) DEFAULT '其他',
        tags TEXT,
        status VARCHAR(20) DEFAULT 'ongoing',
        episode_count INT DEFAULT 0,
        rating DECIMAL(2,1) DEFAULT 0,
        rating_count INT DEFAULT 0,
        view_count INT DEFAULT 0,
        like_count INT DEFAULT 0,
        collect_count INT DEFAULT 0,
        release_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category_id),
        INDEX idx_status (status),
        INDEX idx_view_count (view_count)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS episodes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        drama_id INT NOT NULL,
        episode_number INT NOT NULL,
        title VARCHAR(200),
        video_path VARCHAR(500) NOT NULL,
        duration INT DEFAULT 0,
        view_count INT DEFAULT 0,
        is_free TINYINT DEFAULT 1,
        status TINYINT DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_drama_episode (drama_id, episode_number),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS watch_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        drama_id INT NOT NULL,
        episode_id INT NOT NULL,
        progress INT DEFAULT 0,
        duration INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_drama (user_id, drama_id),
        INDEX idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        drama_id INT NOT NULL,
        type VARCHAR(20) DEFAULT 'favorite',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_drama_type (user_id, drama_id, type),
        INDEX idx_user (user_id),
        INDEX idx_drama (drama_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS email_verification_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(100) NOT NULL,
        code VARCHAR(6) NOT NULL,
        purpose ENUM('register','reset') NOT NULL DEFAULT 'register',
        used TINYINT DEFAULT 0,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 插入默认数据
    const [catRows] = await conn.query('SELECT COUNT(*) as cnt FROM categories');
    if ((catRows as any)[0].cnt === 0) {
      await conn.query(`INSERT INTO categories (name, icon, sort_order) VALUES
        ('都市情感', '🏙️', 1), ('悬疑推理', '🔍', 2), ('科幻奇幻', '🚀', 3),
        ('古装历史', '🏯', 4), ('喜剧搞笑', '😂', 5), ('动作冒险', '💥', 6),
        ('恐怖惊悚', '👻', 7), ('励志成长', '📈', 8)
      `);
    }

    // 插入默认管理员（密码用 bcrypt 哈希）
    const defaultAdmins = [
      { username: 'admin', password: 'admin123', nickname: '超级管理员' },
      { username: 'manager', password: 'manager123', nickname: '运营管理员' },
      { username: 'editor', password: 'editor123', nickname: '内容编辑' },
      { username: 'finance', password: 'finance123', nickname: '财务管理员' },
    ];

    for (const admin of defaultAdmins) {
      const [rows] = await conn.query('SELECT id, password FROM users WHERE username = ?', [admin.username]);
      if ((rows as any[]).length === 0) {
        const hashedPassword = await bcrypt.hash(admin.password, 10);
        await conn.query(
          'INSERT INTO users (username, password, nickname, role, status) VALUES (?, ?, ?, "admin", 1)',
          [admin.username, hashedPassword, admin.nickname]
        );
      } else {
        // 如果管理员密码是明文，自动升级为 bcrypt
        const existing = (rows as any[])[0];
        if (!existing.password.startsWith('$2')) {
          const hashedPassword = await bcrypt.hash(admin.password, 10);
          await conn.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, existing.id]);
        }
      }
    }

    console.log('数据库初始化完成');
  } finally {
    conn.release();
  }
}
