import { Request, Response } from 'express';
import { RawContent } from '../../../models/crawlerModels';

/**
 * Controller for crawled content retrieval
 */
export class ContentController {
  /**
   * Get extracted content for a session
   */
  getExtractedContent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { page = 1, limit = 20, status } = req.query;

      const query: any = { sessionId };
      if (status) {
        query.processingStatus = status;
      }

      const skip = (Number(page) - 1) * Number(limit);
      
      const [content, total] = await Promise.all([
        RawContent.find(query)
          .select('-htmlContent')
          .skip(skip)
          .limit(Number(limit))
          .sort({ createdAt: -1 }),
        RawContent.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: {
          content,
          pagination: {
            currentPage: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            totalItems: total,
            itemsPerPage: Number(limit)
          }
        }
      });

    } catch (error) {
      console.error('Error getting extracted content:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get extracted content',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Get specific content item
   */
  getContentItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, contentId } = req.params;

      const content = await RawContent.findOne({
        _id: contentId,
        sessionId
      });

      if (!content) {
        res.status(404).json({
          success: false,
          message: 'Content not found'
        });
        return;
      }

      res.json({
        success: true,
        data: content
      });

    } catch (error) {
      console.error('Error getting content item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get content item',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
}
