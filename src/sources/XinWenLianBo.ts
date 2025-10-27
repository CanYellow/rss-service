// src/sources/XinWenLianBo.ts
import RSS from 'rss';
import { BaseRssSource } from './IRssSource';
import axios from 'axios';
import * as cheerio from 'cheerio';

// 定义一个简单的接口来表示我们从主页抓取到的新闻项
interface NewsListItem {
  title: string;
  link: string;
  date?: Date; // 新闻发布日期，从主页或文章页解析
}

export class XinWenLianBoSource extends BaseRssSource {
  public readonly id: string = 'xinwenlianbo'; // 在路由中将使用 /rss/xinwenlianbo
  public readonly title: string = 'CCTV 新闻联播';
  public readonly description: string = '中央电视台《新闻联播》最新节目内容的 RSS Feed，包含全文。';
  public readonly link: string = 'https://tv.cctv.com/lm/xwlb/index.shtml'; // 新闻联播主页链接

  /**
   * 抓取并解析一个CCTV新闻联播文章的全文内容。
   * 这个方法现在是 XinWenLianBoSource 内部的私有方法，不暴露给外部。
   * @param url 文章的 URL。
   * @returns Promise<string | null> 提取到的文章 HTML 内容或 null (如果失败)。
   */
  private async parseCctvFullText(url: string): Promise<string | null> {
    try {
      // 确保 URL 是绝对的，处理协议相对 URL (例如 //tv.cctv.com/...)
      const absoluteUrl = url.startsWith('//') ? `https:${url}` : url;

      const response = await axios.get(absoluteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000 // 10秒超时
      });
      
      // === 修正点 1 ===
      // 明确告诉 TypeScript response.data 是 string 类型
      const html: string = response.data as string; 
      const $ = cheerio.load(html);

      // 根据您提供的页面结构，全文内容在 <div class="title_con"><div id="content"> 中
      const contentBody = $('div.title_con #content').first();

      if (contentBody.length > 0) {
        // 清理掉不必要的元素，例如脚本、样式、导航、评论、分享按钮等
        contentBody.find('script, style, header, footer, nav, .sidebar, .comments, .editor_new_pc, .share, .fxg_btn').remove();
        
        // 确保图片和视频的URL是绝对的
        contentBody.find('img').each((i, elem) => {
          const src = $(elem).attr('src');
          if (src && src.startsWith('//')) {
            $(elem).attr('src', `https:${src}`);
          }
        });
        
        return contentBody.html();
      } else {
        console.warn(`[XinWenLianBo] 警告：无法在 ${absoluteUrl} 找到指定的全文内容元素 (div.title_con #content)。`);
        // 尝试一个更通用的回退，例如只返回所有段落文本
        const fallbackContent = $('div.title_con p').map((i, el) => $(el).html()).get().join('<br>');
        if (fallbackContent) {
          console.warn(`[XinWenLianBo] 回退到提取 div.title_con 中的所有段落内容。`);
          return fallbackContent;
        }
        return null;
      }

    } catch (error: any) {
      console.error(`[XinWenLianBo] 从 ${url} 解析全文时发生错误:`, error.message);
      return null;
    }
  }

  public async generateFeed(): Promise<RSS> {
    const feed = this.createBaseRssFeed();
    
    // 新增：获取北京时区的当前日期字符串 "YYYY-MM-DD"
    const beijingDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
    // 新增：创建一个与页面解析逻辑（19点）一致的回退日期对象
    const fallbackBeijingDate = new Date(`${beijingDateStr}T19:00:00+08:00`);

    try {
      // 1. 抓取新闻联播主页 HTML
      console.log(`[XinWenLianBo] 正在抓取新闻联播主页: ${this.link}`);
      const response = await axios.get(this.link, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 15000 // 15秒超时
      });
      // === 修正点 1 ===
      const $ = cheerio.load(response.data as string);

      // 尝试提取新闻列表的整体发布日期 (例如 "2025-10-22")
      let listPublishDate: Date | undefined;
      const dateTextElement = $('div.rilititle p').first();
      if (dateTextElement.length > 0) {
        const dateString = dateTextElement.text().trim().split(' ')[0]; // 提取 "2025-10-22"
        if (dateString) {
          // 假设新闻联播通常在晚上7点播出
          const date = new Date(`${dateString}T19:00:00+08:00`); // 构造一个ISO格式的日期字符串
          if (!isNaN(date.getTime())) {
            listPublishDate = date;
          }
        }
      }
      if (!listPublishDate) {
        listPublishDate = fallbackBeijingDate; // 使用我们定义的北京时区回退日期
        console.warn('[XinWenLianBo] 警告：无法从主页提取列表发布日期，使用当前日期作为回退。');
      }

      // 2. 解析主页，获取每条新闻的链接和标题
      const newsItems: NewsListItem[] = [];
      // 您提到数据在 ul#content.rililist.newsList 中，从第2个 li 开始直到最后一个 li。
      $('#content.rililist.newsList > li').slice(1).each((i, element) => {
        const aTag = $(element).find('a').first(); // 获取 li 内部的第一个 a 标签
        const link = aTag.attr('href');
        // title 属性通常更准确，如果不存在，则回退到文本内容并清理掉“完整版”字样
        const title = aTag.attr('title') || aTag.text().replace(/完整版/g, '').trim(); 
        
        if (link && title) {
          // 确保链接是绝对链接，处理协议相对 URL (例如 //tv.cctv.com/...)
          const absoluteLink = link.startsWith('//') ? `https:${link}` : link;
          newsItems.push({ 
            title: title, 
            link: absoluteLink, 
            date: listPublishDate // 使用从主页提取的列表日期
          });
        }
      });

      console.log(`[XinWenLianBo] 发现 ${newsItems.length} 篇新闻条目，开始抓取全文。`);

      // 3. 遍历新闻条目，抓取每篇文章的全文内容并添加到 Feed
      // 注意：这里是串行抓取，如果新闻条目很多，可能会比较慢。
      // 生产环境可以考虑并行处理 (例如 Promise.all)，但需注意并发请求量。
      for (const item of newsItems) {
        // console.log(`[XinWenLianBo] 正在抓取全文: ${item.title} - ${item.link}`); // 调试信息，可能比较多
        const fullContent = await this.parseCctvFullText(item.link); // 调用内部方法

        feed.item({
          title: item.title,
          description: fullContent || item.title, // 如果没有全文，用标题作为描述
          url: item.link,
          guid: item.link, // 使用链接作为唯一标识符
          // === 修正点 2 ===
          // 确保 date 属性始终是 Date 对象，使用我们定义的北京时区回退日期
          date: item.date || fallbackBeijingDate, 
          categories: ['新闻联播', 'CCTV', '中国新闻'],
          custom_elements: fullContent ? [{ 'content:encoded': { _cdata: fullContent } }] : [],
        });
      }

    } catch (error: any) {
      console.error(`[XinWenLianBo] 生成RSS时发生严重错误:`, error.message);
      // 在出错时，返回一个包含错误信息的 RSS feed，而不是完全失败
      // 在出错时，返回一个包含错误信息的 RSS feed，而不是完全失败
      feed.item({
        title: `抓取CCTV新闻联播RSS失败 - ${fallbackBeijingDate.toISOString()}`,
        description: `无法获取CCTV新闻联播内容。请检查网络连接或网站结构是否改变。错误信息: ${error.message}`,
        url: this.link,
        guid: `error-${Date.now()}`,
        date: fallbackBeijingDate,
      });
    }

    return feed;
  }
}
