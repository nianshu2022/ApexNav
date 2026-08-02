-- Cloudflare D1 Database Schema for ApexNav

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT DEFAULT '',
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY DEFAULT 'main',
  content TEXT DEFAULT '',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Insert Imported Categories
INSERT OR IGNORE INTO categories (id, name, icon, sort_order) VALUES ('1', 'AI', '🤖', 0);
INSERT OR IGNORE INTO categories (id, name, icon, sort_order) VALUES ('4', '社区论坛', '💬', 1);
INSERT OR IGNORE INTO categories (id, name, icon, sort_order) VALUES ('6', '自媒体', '📢', 2);
INSERT OR IGNORE INTO categories (id, name, icon, sort_order) VALUES ('3', '开发设计', '💻', 3);
INSERT OR IGNORE INTO categories (id, name, icon, sort_order) VALUES ('5', '魔法', '🧙‍♀️', 4);
INSERT OR IGNORE INTO categories (id, name, icon, sort_order) VALUES ('2', 'API中转站', '🌍', 5);

-- Insert Imported Bookmarks
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('1', '1', 'ChatGPT', 'http://chatgpt.com/', 'https://www.google.com/s2/favicons?sz=64&domain=chatgpt.com', '', 0);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('5', '2', 'Axon', 'https://prod.bbroot.com/', 'https://www.google.com/s2/favicons?sz=64&domain=prod.bbroot.com', '', 1);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('7', '3', 'Dribbble', 'https://dribbble.com/', 'https://www.google.com/s2/favicons?sz=64&domain=dribbble.com', '', 2);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('8', '4', 'nodeloc', 'https://www.nodeloc.com/', 'https://www.google.com/s2/favicons?sz=64&domain=nodeloc.com', '', 3);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('14', '5', '宝贝云', 'https://web1.bby004.com', 'https://user2.bby012.com/favicon.ico', '', 4);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('19', '6', 'R-Markdown', 'https://r-markdown.pages.dev', 'https://favicon.im/r-markdown.pages.dev?larger=true', '', 5);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('2', '1', 'Gemini', 'https://gemini.google.com/', 'https://favicon.im/gemini.google.com?larger=true', '', 6);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('22', '3', 'React Bits', 'https://reactbits.dev/', 'https://www.google.com/s2/favicons?sz=64&domain=reactbits.dev', '', 7);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('9', '4', 'LINUX DO', 'https://linux.do/', 'https://www.google.com/s2/favicons?sz=64&domain=linux.do', '', 8);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('15', '5', 'cordcloud', 'https://www.cordcloud.biz/', 'https://www.cordcloud.biz/favicon.ico', '', 9);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('20', '6', '微信公众平台', 'https://mp.weixin.qq.com/', 'https://www.google.com/s2/favicons?sz=64&domain=mp.weixin.qq.com', '', 10);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('3', '1', 'DeepSeek', 'https://chat.deepseek.com/', 'https://favicon.im/chat.deepseek.com?larger=true', '', 11);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('10', '4', '零度博客', 'https://www.freedidi.com', 'data:image/svg+xml;charset=utf-8,<svg xmlns%3D''http://www.w3.org/2000/svg'' width%3D''512'' height%3D''512'' viewBox%3D''0 0 512 512''>%0A  <rect width%3D''512'' height%3D''512'' rx%3D''80'' ry%3D''80'' fill%3D''%23000000''/>%0A  <text x%3D''50%25'' y%3D''162.00'' dominant-baseline%3D''middle'' text-anchor%3D''middle'' fill%3D''%23FFA31A'' font-size%3D''174.08'' font-weight%3D''normal'' font-family%3D''Impact%2CImpactFallback%2CArial Black%2CArial%2CHelvetica%2Csans-serif''>%E9%9B%B6%E5%BA%A6</text><text x%3D''50%25'' y%3D''350.00'' dominant-baseline%3D''middle'' text-anchor%3D''middle'' fill%3D''%23FFA31A'' font-size%3D''174.08'' font-weight%3D''normal'' font-family%3D''Impact%2CImpactFallback%2CArial Black%2CArial%2CHelvetica%2Csans-serif''>%E5%8D%9A%E5%AE%A2</text>%0A</svg>', '', 12);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('6', '3', '阿里巴巴矢量图标库', 'https://www.iconfont.cn/', 'https://www.google.com/s2/favicons?sz=64&domain=iconfont.cn', '', 13);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('16', '5', '三毛机场', 'https://xn--ehqx35aimmzwv.com/', '', '', 14);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('4', '1', 'Xiaomi MIMO', 'https://aistudio.xiaomimimo.com/', 'https://www.google.com/s2/favicons?sz=64&domain=aistudio.xiaomimimo.com', '', 15);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('11', '4', '吾爱破解', 'https://www.52pojie.cn/', 'https://www.google.com/s2/favicons?sz=64&domain=52pojie.cn', '', 16);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('12', '3', 'Ant Design Vue', 'https://2x.antdv.com/components/overview-cn/', 'https://www.google.com/s2/favicons?sz=64&domain=2x.antdv.com', '', 17);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('24', '4', 'Discord', 'https://discord.com/', 'https://www.google.com/s2/favicons?sz=64&domain=discord.com', '', 17);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('17', '5', 'Shadowsocks', 'https://secure.shadowsocks.au/', 'https://secure.shadowsocks.au/favicon.ico', '', 18);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('26', '4', 'GitHub', 'https://github.com/', 'https://www.google.com/s2/favicons?sz=64&domain=github.com', '', 18);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('13', '3', '电子邮件 API', 'https://resend.com/', 'https://www.google.com/s2/favicons?sz=64&domain=resend.com', '', 19);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('18', '5', '自建', 'https://nianshu.ccwu.cc/', '', '', 20);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('23', '3', 'VSCode插件网站', 'https://vsc-extension.dreamsoul.cn/', '', '', 20);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('21', '5', 'SSONE', 'https://my.ssonegames.com/', 'https://test01.ssone.io/assets/logo.png', '', 21);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('25', '3', 'uiverse', 'https://uiverse.io/', 'https://www.google.com/s2/favicons?sz=64&domain=uiverse.io', '', 21);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('27', '3', 'lucide', 'https://v0.lucide.dev/', 'https://v0.lucide.dev/logo.light.svg', '', 22);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('28', '3', 'vant', 'https://vant-ui.github.io/', 'https://favicon.im/vant-ui.github.io?larger=true', '', 23);
INSERT OR IGNORE INTO sites (id, category_id, name, url, icon, description, sort_order) VALUES ('29', '3', 'uView', 'https://v1.uviewui.com/', 'https://favicon.im/v1.uviewui.com?larger=true', '', 24);