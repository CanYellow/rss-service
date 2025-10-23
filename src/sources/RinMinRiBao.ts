import RSS from 'rss';
import { BaseRssSource } from './IRssSource';
// Revert to the standard import for older axios versions
import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

// 辅助函数：将 Date 对象格式化为 YYYYMMDD 字符串
function getFormattedDate(date: Date): { yearMonth: string, day: string, fullDate: string } {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return {
    yearMonth: `${year}${month}`,
    day: day,
    fullDate: `${year}-${month}-${day}`
  };
}

// 内部接口，用于在步骤间传递数据
interface PageInfo {
  name: string;
  url: string;
}

interface ArticleListItem {
  title: string;
  link: string;
  pageName: string;
}

export class RenMinRiBaoSource extends BaseRssSource {
  public readonly id: string = 'renminribao';
  public readonly title: string = '人民日报电子版';
  public readonly description: string = '人民日报每日电子版，包含当日各版面文章全文。';
  public readonly link: string = 'https://paper.people.com.cn/rmrb/pc/layout/';
  private readonly paperBaseUrl: string = 'https://paper.people.com.cn/rmrb/pc/layout';

  public async generateFeed(): Promise<RSS> {
    const feed = this.createBaseRssFeed();
    const today = new Date();
    const { yearMonth, day, fullDate } = getFormattedDate(today);
    const mainPageUrl = `${this.paperBaseUrl}/${yearMonth}/${day}/`;

    // --- 第一步：获取当日主页，并从中提取所有版面链接 ---
    let pageLinks: PageInfo[];
    try {
      console.log(`[RenMinRiBao] Fetching main page: ${mainPageUrl}`);
      // 使用回 axios，它完全足够了
      const response = await axios.get(mainPageUrl, { 
          timeout: 15000,
          headers: { // 加上 User-Agent 是个好习惯
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
      });
      const $ = cheerio.load(String(response.data));

      // 【核心修改】使用与实际HTML匹配的正确选择器！
      pageLinks = $('#list li a').map((_, element) => {
        const aTag = $(element);
        const relativeHref = aTag.attr('href');
        
        // .text() 会获取<a>标签内所有文本，包括图片后的文本
        // .trim() 会移除前后的空白和换行符
        const name = aTag.text().trim(); 

        if (relativeHref && name) {
          return { name, url: new URL(relativeHref, mainPageUrl).href };
        }
        return null;
      }).get().filter((item): item is PageInfo => item !== null);

      console.log(`[RenMinRiBao] Found ${pageLinks.length} page links.`);

      if (pageLinks.length === 0) {
        // 如果到了这一步还是失败，那说明网站又改版了
        console.error('[RenMinRiBao] CRITICAL: Failed to find links even with the new selector for #list. Dumping HTML:');
        console.error(String(response.data));
        throw new Error('No page links found on the main page. Selector "#list li a" failed.');
      }
    } catch (error: unknown) { // 您的 catch 块保持不变
      if (
        error &&
        typeof error === 'object' &&
        'isAxiosError' in error &&
        (error as any).response?.status === 404
      ) {
        console.warn(`[RenMinRiBao] Page not found (404) for ${fullDate}. Not published yet.`);
        feed.item({
          title: `人民日报 (${fullDate}) 无更新`,
          description: `今日人民日报尚未发布或页面不存在。`,
          url: mainPageUrl,
          guid: `rmrb-no-update-${fullDate}`,
          date: today,
        });
        return feed;
      }
      // 对于其他错误，直接抛出
      throw new Error(`Failed to fetch or parse RenMinRiBao main page: ${error instanceof Error ? error.message : String(error)}`);
    }
    

    // --- 第二步：并行抓取所有版面，获取所有文章链接 ---
    console.log(`[RenMinRiBao] Found ${pageLinks.length} pages. Fetching article lists...`);
    const articleListPromises = pageLinks.map(async (page) => {
      try {
        const response = await axios.get(page.url, { timeout: 10000 });
        const page$ = cheerio.load(String(response.data));
        return page$('div.news ul.news-list li a').map((_, element) => {
          const aTag = page$(element);
          const title = aTag.text().trim();
          const relativeHref = aTag.attr('href');
          if (relativeHref && title && !title.includes('本版责编')) {
            return {
              title,
              link: new URL(relativeHref, page.url).href,
              pageName: page.name,
            };
          }
          return null;
        }).get().filter((item): item is ArticleListItem => item !== null);
      } catch (err) {
        console.error(`[RenMinRiBao] Failed to fetch page ${page.name}: ${err instanceof Error ? err.message : String(err)}`);
        return []; // 如果单个版面失败，返回空数组
      }
    });

    const allArticles = (await Promise.all(articleListPromises)).flat();
    console.log(`[RenMinRiBao] Found ${allArticles.length} total articles. Fetching full content...`);

    // --- 第三步：并行抓取所有文章的全文内容 ---
    const itemPromises = allArticles.map(async (item) => {
      try {
        const response = await axios.get(item.link, { timeout: 10000 });
        const article$ = cheerio.load(String(response.data));

        const h1Title = article$('div.article > h1 > p').text().trim() || item.title;
        const h3SubTitle = article$('div.article > h3 > p').text().trim();
        const finalTitle = h3SubTitle ? `${h3SubTitle} ${h1Title}` : h1Title;
        const rssItemTitle = `【${item.pageName.split('：')[0]}】${finalTitle}`;

        const dateStr = article$('p.sec span.date span.newstime').first().text().trim();
        const articleDate = dateStr ? new Date(dateStr.replace(/年|月/g, '-').replace(/日/, '')) : today;

        // 将文章中的所有相对路径图片转换为绝对路径
        article$('div.article img').each((_, img) => {
            const imgEl = article$(img);
            const src = imgEl.attr('src');
            if (src && !src.startsWith('http')) {
                imgEl.attr('src', new URL(src, item.link).href);
            }
        });
        
        // 拼接完整的文章内容 HTML
        const contentHtml = 
            (h3SubTitle ? `<h3>${h3SubTitle}</h3>` : '') +
            `<h1>${h1Title}</h1>` +
            (article$('p.sec').first().html() || '') +
            (article$('div.article div.attachment').html() || '') +
            (article$('div.article div#ozoom').html() || '');

        return {
          title: rssItemTitle,
          description: contentHtml,
          url: item.link,
          guid: item.link,
          date: articleDate,
          categories: ['人民日报', item.pageName.split('：')[1]?.trim() || ''],
          custom_elements: [{ 'content:encoded': { _cdata: contentHtml } }],
        };
      } catch (error) {
        console.error(`[RenMinRiBao] Failed to process article ${item.link}: ${error instanceof Error ? error.message : String(error)}`);
        return null; // 如果单篇文章处理失败，返回 null
      }
    });

    // 等待所有文章处理完毕
    const processedItems = await Promise.all(itemPromises);

    // --- 第四步：将所有成功处理的文章数据添加到 Feed 中 ---
    processedItems.forEach(itemData => {
      if (itemData) {
        feed.item(itemData);
      }
    });

    return feed;
  }
}