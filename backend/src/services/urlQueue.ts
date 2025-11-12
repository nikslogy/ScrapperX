import { UrlQueue, IUrlQueue } from '../models/crawlerModels';
import { URL } from 'url';

export class URLQueueService {
  private readonly MAX_RETRIES = 3;

  /**
   * Add a URL to the crawling queue
   */
  async addUrl(
    sessionId: string,
    url: string,
    depth: number,
    parentUrl?: string,
    priority: number = 0
  ): Promise<IUrlQueue> {
    // Check if URL already exists in queue
    const existingUrl = await UrlQueue.findOne({ sessionId, url });
    if (existingUrl) {
      return existingUrl;
    }

    const queueItem = new UrlQueue({
      sessionId,
      url,
      depth,
      parentUrl,
      priority,
      status: 'pending'
    });

    return await queueItem.save();
  }

  /**
   * Add multiple URLs to the queue
   */
  async addUrls(
    sessionId: string,
    urls: { url: string; depth: number; parentUrl?: string; priority?: number }[]
  ): Promise<IUrlQueue[]> {
    const results: IUrlQueue[] = [];
    
    for (const urlData of urls) {
      try {
        const queueItem = await this.addUrl(
          sessionId,
          urlData.url,
          urlData.depth,
          urlData.parentUrl,
          urlData.priority || 0
        );
        results.push(queueItem);
      } catch (error) {
        console.error(`Error adding URL ${urlData.url}:`, error);
      }
    }

    return results;
  }

  /**
   * Get next URL to process (highest priority first)
   */
  async getNextUrl(sessionId: string): Promise<IUrlQueue | null> {
    const urlItem = await UrlQueue.findOneAndUpdate(
      { 
        sessionId, 
        status: 'pending',
        attempts: { $lt: this.MAX_RETRIES }
      },
      { 
        status: 'processing',
        $inc: { attempts: 1 }
      },
      { 
        sort: { priority: -1, depth: 1, discoveredAt: 1 },
        new: true 
      }
    );

    return urlItem;
  }

  /**
   * Mark URL as completed
   */
  async markCompleted(urlId: string): Promise<void> {
    await UrlQueue.findByIdAndUpdate(urlId, {
      status: 'completed',
      processedAt: new Date()
    });
  }

  /**
   * Mark URL as failed
   */
  async markFailed(urlId: string, error: string): Promise<void> {
    await UrlQueue.findByIdAndUpdate(urlId, {
      status: 'failed',
      lastError: error,
      processedAt: new Date()
    });
  }

  /**
   * Reset URL status for retry
   */
  async resetUrl(urlId: string): Promise<void> {
    await UrlQueue.findByIdAndUpdate(urlId, {
      status: 'pending'
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(sessionId: string) {
    const stats = await UrlQueue.aggregate([
      { $match: { sessionId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: 0
    };

    stats.forEach(stat => {
      result[stat._id as keyof typeof result] = stat.count;
      result.total += stat.count;
    });

    return result;
  }

  /**
   * Get URLs by depth level
   */
  async getUrlsByDepth(sessionId: string, depth: number): Promise<IUrlQueue[]> {
    return await UrlQueue.find({ sessionId, depth }).sort({ priority: -1 });
  }

  /**
   * Clean up old queue items
   */
  async cleanupOldUrls(sessionId: string, olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await UrlQueue.deleteMany({
      sessionId,
      status: { $in: ['completed', 'failed'] },
      processedAt: { $lt: cutoffDate }
    });

    return result.deletedCount || 0;
  }

  /**
   * Get pending URLs count
   */
  async getPendingCount(sessionId: string): Promise<number> {
    return await UrlQueue.countDocuments({ 
      sessionId, 
      status: 'pending',
      attempts: { $lt: this.MAX_RETRIES }
    });
  }

  /**
   * Get all URLs for a session
   */
  async getAllUrls(sessionId: string, status?: string): Promise<IUrlQueue[]> {
    const query: any = { sessionId };
    if (status) {
      query.status = status;
    }

    return await UrlQueue.find(query).sort({ priority: -1, depth: 1 });
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  }

  /**
   * Check if URL is internal to domain
   */
  isInternalUrl(url: string, baseDomain: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === baseDomain || urlObj.hostname.endsWith(`.${baseDomain}`);
    } catch {
      return false;
    }
  }

  /**
   * Normalize URL (remove fragments, sort query params)
   */
  normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove fragment
      urlObj.hash = '';
      // Sort query parameters
      urlObj.searchParams.sort();
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Validate URL format
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get failed URLs that can be retried
   */
  async getRetryableUrls(sessionId: string): Promise<IUrlQueue[]> {
    return await UrlQueue.find({
      sessionId,
      status: 'failed',
      attempts: { $lt: this.MAX_RETRIES }
    }).sort({ priority: -1 });
  }

  /**
   * Retry failed URLs
   */
  async retryFailedUrls(sessionId: string): Promise<number> {
    const result = await UrlQueue.updateMany(
      {
        sessionId,
        status: 'failed',
        attempts: { $lt: this.MAX_RETRIES }
      },
      {
        status: 'pending',
        lastError: undefined
      }
    );

    return result.modifiedCount || 0;
  }
} 