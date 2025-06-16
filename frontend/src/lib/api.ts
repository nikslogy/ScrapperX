import { ApiResponse, RobotsCheckData, ScrapedData, ScrapeOptions } from '@/types/scraper';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

const handleApiResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  const data = await response.json();
  
  if (!response.ok) {
    throw new ApiError(
      data.message || data.error || `HTTP ${response.status}`,
      response.status
    );
  }
  
  return data;
};

export const checkRobots = async (url: string, userAgent?: string): Promise<ApiResponse<RobotsCheckData>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/scraper/check-robots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, userAgent }),
    });

    return await handleApiResponse<RobotsCheckData>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to check robots.txt. Please check your connection and try again.');
  }
};

export const scrapeWebsite = async (
  url: string, 
  options?: ScrapeOptions
): Promise<ApiResponse<ScrapedData>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/scraper/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, options }),
    });

    return await handleApiResponse<ScrapedData>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to scrape website. Please check your connection and try again.');
  }
};

export const healthCheck = async (): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return await handleApiResponse(response);
  } catch (error) {
    throw new ApiError('Backend service is not available.');
  }
};

// Export utilities
export { ApiError }; 