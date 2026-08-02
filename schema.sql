-- ApexNav Cloudflare D1 Full Database Schema

-- 1. Users table (Stores hashed credentials for multi-device auth)
CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. User navigation & monitored nodes table (Stores user bookmarks, categories & nodes)
CREATE TABLE IF NOT EXISTS user_nav_data (
  username TEXT PRIMARY KEY,
  categories_json TEXT NOT NULL,
  sites_json TEXT NOT NULL,
  nodes_json TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (username) REFERENCES users(username)
);
