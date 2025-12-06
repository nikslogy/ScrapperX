import { Request, Response, NextFunction } from 'express';
import { urlSchema } from '../validators';
import { RobotsChecker } from '../services/robotsChecker';

/**
 * Controller for robots.txt checking
 */
export const checkRobotsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { error, value } = urlSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.details[0]?.message || 'Validation failed'
      });
      return;
    }

    const { url, userAgent } = value;

    const robotsInfo = await RobotsChecker.checkRobots(url, userAgent);
    const complianceReport = RobotsChecker.generateComplianceReport(robotsInfo);

    res.status(200).json({
      success: true,
      data: {
        robotsInfo,
        complianceReport
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error checking robots.txt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check robots.txt',
      message: error.message
    });
  }
};
