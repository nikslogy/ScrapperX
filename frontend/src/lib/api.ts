import { ApiResponse, RobotsCheckData, ScrapedData, ScrapeOptions, WebsiteProfile, SuccessRatesSummary } from '@/types/scraper';

// Determine API URL based on environment
const getApiBaseUrl = () => {
  // Check if running in browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If hostname indicates local development, use local backend
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      return 'http://localhost:5000';
    }
  }

  // Use environment variable if set, otherwise default to production domain
  return process.env.NEXT_PUBLIC_API_URL || 'https://scrapperx.run.place';
};

const API_BASE_URL = getApiBaseUrl();

// Get API key from environment or localStorage (for self-hosted instances)
const getApiKey = (): string | null => {
  // Server-side: use environment variable
  if (typeof window === 'undefined') {
    return process.env.SCRAPPERX_API_KEY || null;
  }

  // Client-side: check localStorage for self-hosted instances
  const storedKey = localStorage.getItem('scrapperx_api_key');
  if (storedKey) return storedKey;

  // Check if public instance (no auth needed for scrapperx.run.place demo)
  const hostname = window.location.hostname;
  if (hostname === 'scrapperx.run.place') {
    return null; // Public demo - no key needed
  }

  return null;
};

// Set API key (for self-hosted instances)
export const setApiKey = (key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('scrapperx_api_key', key);
  }
};

// Clear API key
export const clearApiKey = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('scrapperx_api_key');
  }
};

// Check if API key is configured
export const hasApiKey = (): boolean => {
  return getApiKey() !== null;
};

class ApiError extends Error {
  constructor(message: string, public status?: number, public requiresAuth?: boolean) {
    super(message);
    this.name = 'ApiError';
  }
}

// Build headers with optional API key
const buildHeaders = (additionalHeaders: Record<string, string> = {}): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders
  };

  const apiKey = getApiKey();
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  return headers;
};

const handleApiResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  // Check if response is ok before parsing
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    let errorData: any = null;
    let requiresAuth = false;

    try {
      errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;

      // Check if authentication is required
      if (response.status === 401) {
        requiresAuth = true;
        errorMessage = 'API key required. Please configure your API key.';
      }
    } catch {
      // If response is not JSON, try to get text
      try {
        const text = await response.text();
        errorMessage = text || errorMessage;
      } catch {
        // Keep default error message
      }
    }

    throw new ApiError(errorMessage, response.status, requiresAuth);
  }

  // Parse JSON only if response is ok
  const data = await response.json();
  return data;
};

export const checkRobots = async (url: string, userAgent?: string): Promise<ApiResponse<RobotsCheckData>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/scraper/check-robots`, {
      method: 'POST',
      headers: buildHeaders(),
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
      headers: buildHeaders(),
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

// Domain Crawler APIs
export const startDomainCrawl = async (url: string, config: any): Promise<ApiResponse<{ sessionId: string }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crawler/start-domain-crawl`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ url, config }),
    });

    return await handleApiResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to start domain crawl.');
  }
};

export const getCrawlSessions = async (): Promise<ApiResponse<{ sessions: any[] }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crawler/sessions`, {
      headers: buildHeaders()
    });
    return await handleApiResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to fetch crawl sessions.');
  }
};

export const getCrawlStatus = async (sessionId: string): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crawler/session/${sessionId}/status`, {
      headers: buildHeaders()
    });
    return await handleApiResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to get crawl status.');
  }
};

export const getCrawlProgress = async (sessionId: string): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crawler/session/${sessionId}/progress`, {
      headers: buildHeaders()
    });
    return await handleApiResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to get crawl progress.');
  }
};

export const getCrawlContent = async (sessionId: string, limit: number = 1000): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crawler/session/${sessionId}/content?limit=${limit}`, {
      headers: buildHeaders()
    });
    return await handleApiResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to get crawl content.');
  }
};

export const pauseCrawl = async (sessionId: string): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crawler/session/${sessionId}/pause`, {
      method: 'POST',
      headers: buildHeaders()
    });
    return await handleApiResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to pause crawl.');
  }
};

export const resumeCrawl = async (sessionId: string): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crawler/session/${sessionId}/resume`, {
      method: 'POST',
      headers: buildHeaders()
    });
    return await handleApiResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to resume crawl.');
  }
};

export const stopCrawl = async (sessionId: string): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crawler/session/${sessionId}/stop`, {
      method: 'POST',
      headers: buildHeaders()
    });
    return await handleApiResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to stop crawl.');
  }
};

// Export APIs
export const exportSession = async (
  sessionId: string,
  format: string,
  options?: {
    includeStructuredData?: boolean;
    includeAIAnalysis?: boolean;
    multiFormat?: boolean;
    qualityFilter?: number;
  }
): Promise<ApiResponse<{ downloadUrl: string; fileName: string; size: number }>> => {
  try {
    const params = new URLSearchParams();
    params.append('format', format);

    if (options?.includeStructuredData) params.append('includeStructuredData', 'true');
    if (options?.includeAIAnalysis) params.append('includeAIAnalysis', 'true');
    if (options?.multiFormat) params.append('multiFormat', 'true');
    if (options?.qualityFilter) params.append('qualityFilter', options.qualityFilter.toString());

    const url = `${API_BASE_URL}/api/crawler/session/${sessionId}/export?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(),
    });

    return await handleApiResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const errorMessage = error instanceof Error
      ? `Failed to export session data: ${error.message}`
      : 'Failed to export session data. Please check if the backend server is running.';
    throw new ApiError(errorMessage);
  }
};

export const getExportHistory = async (): Promise<ApiResponse<any[]>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crawler/exports/history`, {
      headers: buildHeaders()
    });
    return await handleApiResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to get export history.');
  }
};

export const cleanupExports = async (): Promise<ApiResponse<{ cleaned: number }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crawler/exports/cleanup`, {
      method: 'POST',
      headers: buildHeaders()
    });
    return await handleApiResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to cleanup exports.');
  }
};

// Analytics APIs
export const getAnalytics = async (timeRange?: string): Promise<ApiResponse<any>> => {
  try {
    const params = timeRange ? `?timeRange=${timeRange}` : '';
    const response = await fetch(`${API_BASE_URL}/api/crawler/analytics${params}`, {
      headers: buildHeaders()
    });
    return await handleApiResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to fetch analytics.');
  }
};

export const getStructuredData = async (
  sessionId: string,
  filters?: {
    dataType?: string;
    minQuality?: number;
    limit?: number;
    offset?: number;
  }
): Promise<ApiResponse<any>> => {
  try {
    const params = new URLSearchParams();
    if (filters?.dataType) params.append('dataType', filters.dataType);
    if (filters?.minQuality) params.append('minQuality', filters.minQuality.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const response = await fetch(`${API_BASE_URL}/api/crawler/session/${sessionId}/structured-data?${params.toString()}`, {
      headers: buildHeaders()
    });
    return await handleApiResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to fetch structured data.');
  }
};

export const testAuthentication = async (config: any): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/crawler/test-auth`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(config),
    });

    return await handleApiResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to test authentication.');
  }
};

// Legacy Adaptive scraping analytics (keeping for compatibility)
export const getAdaptiveStats = async (domain?: string): Promise<ApiResponse<WebsiteProfile | WebsiteProfile[]>> => {
  try {
    const url = domain
      ? `${API_BASE_URL}/api/scraper/adaptive/stats?domain=${encodeURIComponent(domain)}`
      : `${API_BASE_URL}/api/scraper/adaptive/stats`;

    const response = await fetch(url, {
      headers: buildHeaders()
    });
    return await handleApiResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to get adaptive stats.');
  }
};

export const getSuccessRates = async (): Promise<ApiResponse<SuccessRatesSummary>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/scraper/adaptive/success-rates`, {
      headers: buildHeaders()
    });
    return await handleApiResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to get success rates.');
  }
};

export const clearAdaptiveProfile = async (domain: string): Promise<ApiResponse<{ message: string }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/scraper/adaptive/profile/${encodeURIComponent(domain)}`, {
      method: 'DELETE',
      headers: buildHeaders()
    });
    return await handleApiResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to clear adaptive profile.');
  }
};

export const exportAdaptiveProfiles = async (): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/scraper/adaptive/export`, {
      headers: buildHeaders()
    });
    if (!response.ok) {
      throw new ApiError(`HTTP ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to export adaptive profiles.');
  }
};

export const importAdaptiveProfiles = async (profiles: string): Promise<ApiResponse<{ message: string }>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/scraper/adaptive/import`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ profiles }),
    });
    return await handleApiResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to import adaptive profiles.');
  }
};

// Get download URL for exported files
export const getDownloadUrl = (fileName: string): string => {
  return `${API_BASE_URL}/api/downloads/${fileName}`;
};

// Export utilities
export { ApiError };