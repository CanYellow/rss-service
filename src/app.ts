// src/app.ts

// 所有的 import 语句保持在文件顶部
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import rssRoutes from './routes/rss';
import { initializeRssSources } from './sources';

// 创建一个主函数来包裹整个应用的启动逻辑
async function startServer() {
  const app = express();
  // 注意：我们将端口号解析为数字，这是一种更安全的做法
  const PORT = parseInt(process.env.PORT || '3001', 10);

  // --- 应用程序设置开始 ---

  // 按顺序执行初始化任务
  console.log('正在初始化RSS源...');
  initializeRssSources();
  console.log('RSS源初始化完成。');

  // 注册路由和中间件
  app.use('/rss', rssRoutes);
  app.get('/', (req: Request, res: Response) => {
    res.send('欢迎来到极简RSS服务演示！请访问 /rss 查看可用Feed。');
  });

  // 注册全局错误处理中间件
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).send('服务器内部错误！');
  });

  // --- 应用程序设置结束 ---

  // --- 启动服务器并处理端口错误 ---

  // 1. 调用 app.listen 会返回一个 http.Server 的实例
  const server = app.listen(PORT, () => {
    // 这个成功回调只会在端口监听成功时触发
    console.log(`⚡️[服务器]: 服务器已运行在 http://localhost:${PORT}`);
    console.log(`请访问 http://localhost:${PORT}/rss 查看可用Feed列表。`);
  });

  // 2. 在 server 实例上专门监听 'error' 事件
  // 这是捕获 EADDRINUSE (地址已占用) 错误的正确方法
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error('===========================================================');
      console.error(`❌ 致命错误: 端口 ${PORT} 已被占用。`);
      console.error('请检查是否有其他应用 (例如另一个PM2进程) 正在使用此端口。');
      console.error('===========================================================');
    } else {
      // 处理其他可能的启动错误，例如权限不足等
      console.error('❌ 服务器启动时发生未知错误:', error);
    }
    // 无论发生哪种启动错误，都应该退出进程
    process.exit(1);
  });
}

// 调用主函数，启动整个应用程序
startServer();