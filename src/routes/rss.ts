// src/routes/rss.ts
import { Router, Request, Response, NextFunction } from 'express';
import { rssSourceRegistry } from '../sources/RssSourceRegistry';

const router = Router();

/**
 * GET /rss
 * 返回所有可用的 RSS 源列表。
 * 这是为了方便用户发现有哪些可用的RSS服务。
 */
router.get('/', (req: Request, res: Response) => {
  const availableSources = rssSourceRegistry.getAllIds();
  res.json({
    message: '欢迎来到极简RSS服务演示！',
    availableSources: availableSources,
    instructions: '通过访问 /rss/{sourceId} 来获取特定的Feed内容。',
  });
});

/**
 * GET /rss/:sourceId
 * 根据 sourceId 动态（在框架层面上是动态的，内容是硬编码的）生成并返回 RSS Feed。
 * 这是您说的“接收用户rss的请求路由，将其分发至相应的订阅地址的处理的中间件，
 * 获取中间件提供的rss内容，将内容提供给用户”的实现。
 */
router.get('/:sourceId', async (req: Request, res: Response, next: NextFunction) => {
  const { sourceId } = req.params; // 从路由参数中获取源ID
  const source = rssSourceRegistry.get(sourceId); // 使用注册器查找对应的RSS源处理器

  if (!source) {
    // 如果找不到对应的 RSS 源，返回 404 错误
    return res.status(404).send(`错误：RSS源 '${sourceId}' 未找到。可用源：${rssSourceRegistry.getAllIds().join(', ')}`);
  }

  try {
    // 调用找到的 RSS 源的 generateFeed 方法获取 RSS 对象
    // 对于 HardcodedFeedSource，这里获取的是硬编码的RSS内容
    const feed = await source.generateFeed();
    // 设置响应头为 XML 类型，并发送生成的 XML 内容给用户
    res.type('application/xml').send(feed.xml());
  } catch (error) {
    // 捕获生成 RSS 过程中的错误，并传递给 Express 的错误处理中间件
    console.error(`为源 '${sourceId}' 生成RSS时发生错误:`, error);
    next(error); // 将错误传递给下一个中间件（错误处理器）
  }
});

export default router;