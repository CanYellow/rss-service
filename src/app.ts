// src/app.ts

// 所有的 import 语句保持在文件顶部
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import rssRoutes from './routes/rss';
import { initializeRssSources } from './sources';

// 1. 创建一个主函数来包裹整个应用的启动逻辑
async function startServer() {
  // 2. 使用 try...catch 来捕获任何启动过程中的致命错误
  try {
    const app = express();
    const PORT = process.env.PORT || 3000;

    // --- 应用程序设置开始 ---

    // 按顺序执行初始化任务
    console.log('正在初始化RSS源...');
    // 注意：即使 initializeRssSources 目前是同步的，把它放在这里也是正确的模式。
    // 如果它未来变成异步的，你只需要在这里加上 'await' 即可。
    initializeRssSources();
    console.log('RSS源初始化完成。');

    // 注册路由和中间件
    app.use('/rss', rssRoutes);
    app.get('/', (req: Request, res: Response) => {
      res.send('欢迎来到极简RSS服务演示！请访问 /rss 查看可用Feed。');
    });

    // 注册全局错误处理中间件（通常放在路由之后）
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error(err.stack);
      res.status(500).send('服务器内部错误！');
    });

    // --- 应用程序设置结束 ---

    // 3. 在所有设置都完成后，最后一步才是启动服务器监听
    app.listen(PORT, () => {
      console.log(`⚡️[服务器]: 服务器已运行在 http://localhost:${PORT}`);
      console.log(`请访问 http://localhost:${PORT}/rss 查看可用Feed列表。`);
    });

  } catch (error) {
    console.error('服务器启动失败:', error);
    // 如果启动过程中发生错误，则以非零状态码退出进程
    process.exit(1);
  }
}

// 4. 调用主函数，启动整个应用程序
startServer();