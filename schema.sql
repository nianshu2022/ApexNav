-- ApexNav Multi-Account Cloudflare D1 Database Schema
CREATE TABLE IF NOT EXISTS user_nav_data (
  username TEXT PRIMARY KEY,
  categories_json TEXT NOT NULL,
  sites_json TEXT NOT NULL,
  nodes_json TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
