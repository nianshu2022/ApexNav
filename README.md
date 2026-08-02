# 🍏 ApexNav (极简苹果风个人/公共导航主页)

ApexNav 是一款基于 **React 19 + TypeScript + Tailwind CSS v4 + Vite** 打造的苹果 Vision Pro 玻璃质感极简导航主页。自带多引擎搜索联想、小组件 Bento 视图、双模式权限控制与本地 JSON 备份恢复。

![ApexNav Preview](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop)

---

## ✨ 核心特性

- 🍎 **Vision Pro 苹果美学**：精致毛玻璃（Glassmorphism）、微交互动画、动态背景气泡与 Unsplash 5K 4K 随心高清壁纸。
- 🔍 **4 合 1 智能搜索**：内置 Google、Bing、Baidu、DuckDuckGo，支持键盘 `Tab` 快速切引擎、输入时自动下拉联想词，支持直接回车跳转或搜索本地书签。
- 🍱 **Bento 小组件矩阵**：
  - 🌤️ **实时天气卡片**：自动定位 / 搜索切换城市、未来 3 天预报、24 小时气温趋势与空气指标。
  - 💬 **一言 Poetry 语录**：包含动漫、诗词、哲学分类，支持收藏与一键刷新。
  - 📅 **极简月历组件**：高清月视图与当前日期高亮。
  - ⚡ **节点运行监控**：支持节点 Ping 延迟测试与在线率统计。
- 🔒 **无后端无敏感泄漏**：
  - 访客只读模式：任何人均可流畅浏览、搜索、跳转，无法篡改书签与节点。
  - 管理员模式：随时输入账号密码解锁编辑权限（数据在本地浏览器进行 SHA-256 加密存取）。
- 📦 **本地优先 & 一键备份**：数据均存储在 `localStorage`，支持一键导出为 JSON 备份文件及随时导入还原。
- 🚀 **零成本部署**：天然适配 Cloudflare Pages、Vercel、Netlify 等静态托管平台。

---

## 🛠️ 技术栈

- **前端框架**：React 19, TypeScript
- **构建工具**：Vite 6
- **样式框架**：Tailwind CSS v4, Lucide Icons
- **访问统计**：不显眼微型不蒜子（Busuanzi）或自建计数器

---

## 🚀 快速开始

### 1. 克隆项目与安装依赖

```bash
git clone https://github.com/your-username/ApexNav.git
cd ApexNav
npm install
```

### 2. 本地开发启动

```bash
npm run dev
```
打开浏览器访问 `http://localhost:5173` 即可预览。

### 3. 构建生产包

```bash
npm run build
```
打包输出目录为 `dist/`。

---

## ☁️ 部署指南 (Cloudflare Pages)

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 导航至 **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**。
3. 选择你的 ApexNav 仓库。
4. 构建设置填入：
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. 点击 **Save and Deploy** 即可完成秒级部署！

---

## 🔑 首次登录与权限说明

- **访客**：打开页面默认呈现通用演示网址，无法添加/删除/修改书签或节点。
- **管理者**：
  1. 点击右上角 **🔒 锁头图标**。
  2. 首次使用时，弹窗会自动提示 **“设置管理账号”**，输入你自定义的用户名和密码即可。
  3. 登录成功后右上角呈现 **⚙️ 齿轮图标**，所有分类、书签卡片右上角将显示编辑与删除按钮。
  4. 支持在 **设置 -> 安全设置** 中随时修改账号密码或退出登录。

---

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 协议开源。欢迎 Star 与 Fork！
