-- ApexNav Cloudflare D1 Database Schema
CREATE TABLE IF NOT EXISTS nav_data (
  id TEXT PRIMARY KEY,
  categories_json TEXT NOT NULL,
  sites_json TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
