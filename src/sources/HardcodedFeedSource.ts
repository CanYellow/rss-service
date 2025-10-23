// src/sources/HardcodedFeedSource.ts
import RSS from 'rss';
import { BaseRssSource } from './IRssSource';

/**
 * HardcodedFeedSource 是一个提供硬编码内容的 RSS 源。
 * 它不进行任何外部请求，只返回预设的RSS XML。
 */
export class HardcodedFeedSource extends BaseRssSource {
  public readonly id: string = 'my-hardcoded-feed'; // 路由中将使用 /rss/my-hardcoded-feed
  public readonly title: string = '我的硬编码 RSS Feed';
  public readonly description: string = '这是一个完全固定，用于演示框架的RSS Feed。';
  public readonly link: string = 'http://example.com/hardcoded';

  /**
   * 生成硬编码的 RSS Feed。
   * @returns Promise<RSS> 包含硬编码内容的 RSS 对象。
   */
  public async generateFeed(): Promise<RSS> {
    const feed = this.createBaseRssFeed();

    // !!! 这就是您要求的“固定RSS内容做最简实现”！！！
    // 我们在这里直接添加硬编码的 RSS 文章条目
    feed.item({
      title: '第一篇硬编码文章',
      description: '这是第一篇固定内容的文章描述，内容是写死的。',
      url: 'http://example.com/hardcoded/article1',
      guid: 'hardcoded-article-1',
      date: new Date(Date.now() - 24 * 60 * 60 * 1000), // 昨天的日期
      author: '固定作者A',
      categories: ['分类一', '演示'],
      // 全文内容也直接硬编码
      custom_elements: [{ 'content:encoded': { _cdata: '<p>这篇硬编码文章的<b>完整内容</b>。</p><p>没有任何动态生成或解析。</p>' } }],
    });

    feed.item({
      title: '第二篇硬编码文章',
      description: '这是第二篇固定内容的文章描述。',
      url: 'http://example.com/hardcoded/article2',
      guid: 'hardcoded-article-2',
      date: new Date(Date.now() - 48 * 60 * 60 * 1000), // 前天的日期
      author: '固定作者B',
      categories: ['分类二'],
      // 也可以不提供全文内容
    });

    return feed;
  }
}