# 🤝 ApexNav 贡献指南 (Contributing Guide)

感谢你对 **ApexNav** 开源项目的关注与支持！我们非常欢迎社区开发者提交 Issue、改进功能或优化代码。

为了保持代码质量与项目规范，请在参与贡献前阅读以下指南：

---

## 🛠️ 本地开发环境准备

### 1. 软件要求
- **Node.js**: `>= 18.0.0`
- **npm**: `>= 9.0.0`

### 2. 克隆与安装依赖
```bash
git clone https://github.com/nianshu2022/ApexNav.git
cd ApexNav
npm install
```

### 3. 启动开发服务器
```bash
npm run dev
```
本地项目将默认启动在 `http://localhost:5173`。

---

## 规范与质量检查

在提交 Pull Request 前，请确保代码通过了本地构建与代码检查：

```bash
# 1. 运行 TypeScript 类型检查与 Vite 打包
npm run build

# 2. 运行 Oxlint 静态代码检查
npm run lint
```

---

## 🌿 Git 分支与 Commit 规范

- 主分支为 `main`。请基于 `main` 拉取新分支开发，格式如 `feature/xxx` 或 `fix/xxx`。
- Commit 信息建议遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：
  - `feat:` 新增功能
  - `fix:` 修复 Bug
  - `docs:` 文档修改
  - `style:` 代码格式优化（不影响逻辑）
  - `refactor:` 重构代码
  - `chore:` 构建或辅助工具配置更新

---

## 📬 提交 PR 须知

1. 请先搜索已有的 [Issues](https://github.com/nianshu2022/ApexNav/issues) 和 [Pull Requests](https://github.com/nianshu2022/ApexNav/pulls)，避免重复工作。
2. 为你的 PR 编写清晰的标题与描述，说明改变的动机与测试结果。
3. 保持 PR 的单一职责，尽量不要将互不相关的修改打包在一个 PR 中。

再次感谢你的贡献！让我们一起把 ApexNav 打造得更加精致易用！
