import { Request, Response } from 'express';
import { testAuthSchema } from '../validators';
import { AuthenticationHandler } from '../services/authenticationHandler';

/**
 * Controller for authentication testing
 */
export class AuthenticationController {
  /**
   * Test authentication configuration
   */
  testAuthentication = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = testAuthSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: error.details.map(d => d.message)
        });
        return;
      }

      const { url, authentication } = value;

      const authHandler = new AuthenticationHandler();
      const testResult = await authHandler.testAuthentication(authentication, url);

      res.json({
        success: testResult.success,
        message: testResult.success ? 'Authentication test successful' : 'Authentication test failed',
        data: {
          url,
          authenticationType: authentication.type,
          testResult: testResult.success ? 'Authentication successful' : testResult.error,
          sessionData: testResult.sessionData,
          error: testResult.error
        }
      });

    } catch (error) {
      console.error('Error testing authentication:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test authentication',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
}
