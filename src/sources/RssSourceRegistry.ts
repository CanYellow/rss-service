// src/sources/RssSourceRegistry.ts
import { IRssSource } from './IRssSource';

/**
 * RssSourceRegistry 类用于管理和存储所有可用的 RSS 源。
 * 它提供了一种机制来注册新的 RSS 源，并根据其ID检索它们。
 * 这就是您说的“将其分发至相应的订阅地址的处理的中间件”中的“分发”机制。
 */
class RssSourceRegistry {
  private sources: Map<string, IRssSource> = new Map();

  /**
   * 注册一个新的 RSS 源。
   * @param source 实现了 IRssSource 接口的 RSS 源实例。
   */
  public register(source: IRssSource): void {
    if (this.sources.has(source.id)) {
      console.warn(`尝试重复注册ID为 '${source.id}' 的RSS源。已跳过。`);
      return;
    }
    this.sources.set(source.id, source);
    console.log(`已注册RSS源: ${source.id}`);
  }

  /**
   * 根据其ID获取一个 RSS 源处理器。
   * @param id 要查找的 RSS 源的唯一标识符。
   * @returns 匹配的 IRssSource 实例，如果找不到则返回 undefined。
   */
  public get(id: string): IRssSource | undefined {
    return this.sources.get(id);
  }

  /**
   * 获取所有已注册 RSS 源的 ID 列表。
   * @returns 一个包含所有注册源ID的字符串数组。
   */
  public getAllIds(): string[] {
    return Array.from(this.sources.keys());
  }
}

// 导出一个单例实例，以便在应用的其他部分中使用。
export const rssSourceRegistry = new RssSourceRegistry();