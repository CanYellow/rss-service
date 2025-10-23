// src/sources/index.ts
import { rssSourceRegistry } from './RssSourceRegistry';
import { HardcodedFeedSource } from './HardcodedFeedSource';
import { XinWenLianBoSource } from './XinWenLianBo'; // 导入新闻联播源
import { RenMinRiBaoSource } from './RinMinRiBao'; // 导入人民日报源

/**
 * 初始化并注册所有的 RSS 源。
 * 这个函数应该在应用启动时调用一次。
 */
export function initializeRssSources(): void {
  // 注册我们的硬编码 RSS 源
  rssSourceRegistry.register(new HardcodedFeedSource());
  rssSourceRegistry.register(new XinWenLianBoSource()); // 注册新闻联播源
  rssSourceRegistry.register(new RenMinRiBaoSource()); // 注册人民日报源
  
  // 这里的注释展示了将来如何添加更多源，但现在我们只保留一个最简的。
  // rssSourceRegistry.register(new AnotherHardcodedFeedSource());
  // rssSourceRegistry.register(new MyBlogFeedSource()); // 将来可以实现动态获取的源

  console.log('所有RSS源已初始化并注册。');
}