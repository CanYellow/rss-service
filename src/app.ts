// src/app.ts
import 'dotenv/config'; // 加载 .env 文件中的环境变量
import express, { Request, Response, NextFunction } from 'express';
import rssRoutes from './routes/rss';
import { initializeRssSources } from './sources'; // 引入RSS源初始化函数

const app = express();
const PORT = process.env.PORT || 3000;

// 初始化并注册所有 RSS 源（目前只有硬编码源）
initializeRssSources();

// 使用 RSS 路由
app.use('/rss', rssRoutes);

// 根路由，提供欢迎信息
app.get('/', (req: Request, res: Response) => {
  res.send('欢迎来到极简RSS服务演示！请访问 /rss 查看可用Feed。');
});

// 全局错误处理中间件
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack); // 打印错误堆栈
  res.status(500).send('服务器内部错误！');
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`⚡️[服务器]: 服务器已运行在 http://localhost:${PORT}`);
  console.log(`请访问 http://localhost:${PORT}/rss 查看可用Feed列表。`);
});