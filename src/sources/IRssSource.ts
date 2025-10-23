// src/sources/IRssSource.ts
import RSS from 'rss';

/**
 * 定义RSS源的接口。每个RSS源都需要实现这个接口来生成其特定的RSS Feed。
 * 这是框架中“分发至相应的订阅地址的处理的中间件”的核心抽象。
 */
export interface IRssSource {
  /** 唯一的标识符，用于路由匹配 (e.g., 'my-feed', 'another-feed') */
  readonly id: string;
  /** RSS Feed 的标题 */
  readonly title: string;
  /** RSS Feed 的描述 */
  readonly description: string;
  /** RSS Feed 的链接 */
  readonly link: string;
  /**
   * 异步方法，用于生成并返回 RSS Feed 对象。
   * @returns Promise<RSS> 返回一个包含RSS Feed内容的 RSS 对象。
   */
  generateFeed(): Promise<RSS>;
}

/**
 * 抽象基类，提供一些通用的RSS源属性和初始化RSS对象的方法。
 * 方便具体RSS源的实现。
 */
export abstract class BaseRssSource implements IRssSource {
  public abstract readonly id: string;
  public abstract readonly title: string;
  public abstract readonly description: string;
  public abstract readonly link: string;

  /**
   * 创建一个 RSS.Feed 实例并设置基本属性。
   * @returns 一个 RSS.Feed 实例。
   */
  protected createBaseRssFeed(): RSS {
    // 这里使用 process.env.BASE_URL 是为了在部署时生成正确的 feed_url
    // 如果没有设置，默认为 localhost
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    return new RSS({
      title: this.title,
      description: this.description,
      feed_url: `${baseUrl}/rss/${this.id}`, // 完整的 feed URL
      site_url: this.link,
      language: 'zh-CN',
      pubDate: new Date().toUTCString(),
      ttl: 60, // 缓存时间（分钟）
    });
  }

  public abstract generateFeed(): Promise<RSS>;
}