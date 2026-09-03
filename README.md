
  # 秋招实习路径导航工具

  This is a code bundle for 秋招实习路径导航工具. The original project is available at https://www.figma.com/design/6TxArNUo6Ru4yzweJxyoCf/%E7%A7%8B%E6%8B%9B%E5%AE%9E%E4%B9%A0%E8%B7%AF%E5%BE%84%E5%AF%BC%E8%88%AA%E5%B7%A5%E5%85%B7.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## AI API 接入

  本项目的“青云启航 -> 开始AI分析”已支持调用 OpenAI 兼容接口。

  1. 复制 `.env.example` 为 `.env.local`
  2. 在 `.env.local` 中填写：

  ```bash
  VITE_AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
  VITE_AI_API_KEY=your_api_key
  VITE_AI_MODEL=qwen3.6-flash
  ```

  3. 重新启动开发服务器：`npm run dev`

  注意：`VITE_` 前缀变量会被前端读取，适合本地开发与课程演示。生产环境建议通过后端代理保存密钥，不要把真实密钥直接暴露给浏览器。

  ## Vercel 部署

  1. 打开 Vercel，登录你的 GitHub 账号。
  2. 选择 `Add New -> Project`，导入这个仓库。
  3. 构建设置保持默认识别为 Vite，或手动填写：

  ```bash
  Build Command: npm run build
  Output Directory: dist
  ```

  4. 如果你要在生产环境继续使用 AI 分析，就在 Vercel 的 Environment Variables 里添加：

  ```bash
  VITE_AI_BASE_URL
  VITE_AI_API_KEY
  VITE_AI_MODEL
  ```

  并把 `VITE_AI_MODEL` 的值同步成 `qwen3.6-flash`。

  5. 点击 Deploy，等构建完成后就会拿到一个线上地址。

  仓库里已经加入 `vercel.json`，用于 React Router 的页面刷新回退，避免访问子路由时出现 404。

  ## Git团队协作测试
  A：我负责前端页面开发
  B：我负责后端接口开发
  55 sss