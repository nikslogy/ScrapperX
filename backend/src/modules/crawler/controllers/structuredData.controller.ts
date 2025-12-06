import { Request, Response } from 'express';
import { RawContent } from '../../../models/crawlerModels';

/**
 * Controller for structured data extraction endpoints
 */
export class StructuredDataController {
  /**
   * Get structured data extraction results
   */
  getStructuredData = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { minQuality = 0.5 } = req.query;

      const content = await RawContent.find({
        sessionId,
        'metadata.extractedData': { $exists: true },
        'metadata.extractedData.qualityScore': { $gte: Number(minQuality) }
      }).select('-htmlContent').sort({ 'metadata.extractedData.qualityScore': -1 });

      if (content.length === 0) {
        res.status(404).json({
          success: false,
          message: 'No structured data found for this session'
        });
        return;
      }

      const groupedData: { [key: string]: any[] } = {};
      let totalItems = 0;
      let averageQuality = 0;

      content.forEach(item => {
        const extractedData = item.metadata.extractedData;
        if (extractedData) {
          const schema = extractedData.schema;
          if (!groupedData[schema]) {
            groupedData[schema] = [];
          }
          
          groupedData[schema].push({
            url: item.url,
            schema: extractedData.schema,
            version: extractedData.version,
            fields: extractedData.fields,
            nestedStructures: extractedData.nestedStructures,
            qualityScore: extractedData.qualityScore,
            extractionMethod: extractedData.extractionMethod,
            extractedAt: extractedData.extractedAt
          });

          totalItems++;
          averageQuality += extractedData.qualityScore;
        }
      });

      averageQuality = totalItems > 0 ? averageQuality / totalItems : 0;

      res.json({
        success: true,
        data: {
          sessionId,
          totalItems,
          averageQuality: Math.round(averageQuality * 100) / 100,
          schemas: Object.keys(groupedData),
          extractedData: groupedData
        }
      });

    } catch (error) {
      console.error('Error getting structured data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get structured data',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Get structured data by schema type
   */
  getStructuredDataBySchema = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, schema } = req.params;
      const { minQuality = 0.5, limit = 100 } = req.query;

      const content = await RawContent.find({
        sessionId,
        'metadata.extractedData.schema': schema,
        'metadata.extractedData.qualityScore': { $gte: Number(minQuality) }
      }).select('url metadata.extractedData')
        .sort({ 'metadata.extractedData.qualityScore': -1 })
        .limit(Number(limit));

      if (content.length === 0) {
        res.status(404).json({
          success: false,
          message: `No ${schema} data found for this session`
        });
        return;
      }

      const structuredData = content.map(item => ({
        url: item.url,
        ...item.metadata.extractedData
      }));

      res.json({
        success: true,
        data: {
          sessionId,
          schema,
          count: structuredData.length,
          items: structuredData
        }
      });

    } catch (error) {
      console.error('Error getting structured data by schema:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get structured data by schema',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Get available extraction schemas
   */
  getAvailableSchemas = async (req: Request, res: Response): Promise<void> => {
    try {
      const schemas = [
        'product', 'article', 'contact', 'event', 'job', 'generic'
      ];

      res.json({
        success: true,
        data: {
          schemas,
          count: schemas.length
        }
      });

    } catch (error) {
      console.error('Error getting available schemas:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get available schemas',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
}
