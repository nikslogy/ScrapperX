import { Request, Response, NextFunction } from 'express';
import { IntelligentScraper } from '../services/intelligentScraper';
import { importProfilesSchema } from '../validators';

/**
 * Get adaptive scraping statistics
 */
export const getAdaptiveStatsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const intelligentScraper = new IntelligentScraper();
  
  try {
    const { domain } = req.query;
    const stats = intelligentScraper.getAdaptiveStats(domain as string);
    
    res.status(200).json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error getting adaptive stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get adaptive stats',
      message: error.message
    });
  } finally {
    await intelligentScraper.cleanup();
  }
};

/**
 * Get success rates across domains
 */
export const getSuccessRatesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const intelligentScraper = new IntelligentScraper();
  
  try {
    const successRates = intelligentScraper.getSuccessRates();
    
    res.status(200).json({
      success: true,
      data: {
        totalDomains: successRates.length,
        successRates: successRates,
        summary: {
          averageStaticSuccess: successRates.reduce((acc, curr) => acc + curr.rates.static, 0) / successRates.length || 0,
          averageDynamicSuccess: successRates.reduce((acc, curr) => acc + curr.rates.dynamic, 0) / successRates.length || 0,
          averageStealthSuccess: successRates.reduce((acc, curr) => acc + curr.rates.stealth, 0) / successRates.length || 0,
          difficultyDistribution: {
            easy: successRates.filter(s => s.difficulty === 'easy').length,
            medium: successRates.filter(s => s.difficulty === 'medium').length,
            hard: successRates.filter(s => s.difficulty === 'hard').length,
            extreme: successRates.filter(s => s.difficulty === 'extreme').length
          }
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error getting success rates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get success rates',
      message: error.message
    });
  } finally {
    await intelligentScraper.cleanup();
  }
};

/**
 * Clear adaptive profile for a specific domain
 */
export const clearAdaptiveProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const intelligentScraper = new IntelligentScraper();
  
  try {
    const { domain } = req.params;
    
    if (!domain) {
      res.status(400).json({
        success: false,
        error: 'Domain parameter is required'
      });
      return;
    }
    
    intelligentScraper.clearAdaptiveProfile(domain);
    
    res.status(200).json({
      success: true,
      message: `Adaptive profile cleared for domain: ${domain}`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error clearing adaptive profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear adaptive profile',
      message: error.message
    });
  } finally {
    await intelligentScraper.cleanup();
  }
};

/**
 * Export all adaptive profiles
 */
export const exportAdaptiveProfilesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const intelligentScraper = new IntelligentScraper();
  
  try {
    const profiles = intelligentScraper.exportAdaptiveProfiles();
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="adaptive-profiles.json"');
    res.status(200).send(profiles);
  } catch (error: any) {
    console.error('Error exporting adaptive profiles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export adaptive profiles',
      message: error.message
    });
  } finally {
    await intelligentScraper.cleanup();
  }
};

/**
 * Import adaptive profiles
 */
export const importAdaptiveProfilesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const intelligentScraper = new IntelligentScraper();
  
  try {
    const { error, value } = importProfilesSchema.validate(req.body);
    
    if (error) {
      res.status(400).json({
        success: false,
        error: 'Profiles data is required as JSON string'
      });
      return;
    }
    
    intelligentScraper.importAdaptiveProfiles(value.profiles);
    
    res.status(200).json({
      success: true,
      message: 'Adaptive profiles imported successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error importing adaptive profiles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import adaptive profiles',
      message: error.message
    });
  } finally {
    await intelligentScraper.cleanup();
  }
};
