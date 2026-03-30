/**
 * SeniorShield Complete APIs Routes
 * Endpoints for 6 free APIs with health monitoring and graceful degradation
 */

import express, { Router, Request, Response } from 'express';
import CompleteAPIsService from './SeniorShield-Complete-APIs-Integration';

const router = Router();

// Initialize the service with API keys from environment
const completeAPIsService = new CompleteAPIsService(
  process.env.WEATHER_API_KEY || '',
  process.env.NEWS_API_KEY || ''
);

/**
 * GET /api/complete-apis/weather/:city
 * Get weather information for a city
 */
router.get('/weather/:city', async (req: Request, res: Response) => {
  try {
    const { city } = req.params;

    if (!city || city.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'City parameter is required',
      });
    }

    const result = await completeAPIsService.getWeather(city);
    res.json(result);
  } catch (error) {
    console.error('Weather endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weather',
    });
  }
});

/**
 * GET /api/complete-apis/news/:query
 * Search for current news
 */
router.get('/news/:query', async (req: Request, res: Response) => {
  try {
    const { query } = req.params;
    const { country } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required',
      });
    }

    const result = await completeAPIsService.getNews(query, (country as string) || 'us');
    res.json(result);
  } catch (error) {
    console.error('News endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news',
    });
  }
});

/**
 * GET /api/complete-apis/wikipedia/:query
 * Search Wikipedia for general knowledge
 */
router.get('/wikipedia/:query', async (req: Request, res: Response) => {
  try {
    const { query } = req.params;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required',
      });
    }

    const result = await completeAPIsService.searchWikipedia(query);
    res.json(result);
  } catch (error) {
    console.error('Wikipedia endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search Wikipedia',
    });
  }
});

/**
 * GET /api/complete-apis/time/:timezone
 * Get time information for a timezone
 */
router.get('/time/:timezone', async (req: Request, res: Response) => {
  try {
    const { timezone } = req.params;

    if (!timezone || timezone.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Timezone parameter is required',
      });
    }

    const result = await completeAPIsService.getTime(timezone);
    res.json(result);
  } catch (error) {
    console.error('Time endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch time information',
    });
  }
});

/**
 * GET /api/complete-apis/sports/:query
 * Get sports information and scores
 */
router.get('/sports/:query', async (req: Request, res: Response) => {
  try {
    const { query } = req.params;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required',
      });
    }

    const result = await completeAPIsService.getSportsInfo(query);
    res.json(result);
  } catch (error) {
    console.error('Sports endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sports information',
    });
  }
});

/**
 * GET /api/complete-apis/bible/:reference
 * Get Bible verse
 */
router.get('/bible/:reference', async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;
    const { translation } = req.query;

    if (!reference || reference.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bible reference is required',
      });
    }

    const result = await completeAPIsService.getBibleVerse(reference, (translation as string) || 'kjv');
    res.json(result);
  } catch (error) {
    console.error('Bible endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Bible verse',
    });
  }
});

/**
 * POST /api/complete-apis/contextual
 * Smart query detection - automatically determines which API to use
 * Request body: { query: string, location?: string }
 */
router.post('/contextual', async (req: Request, res: Response) => {
  try {
    const { query, location } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Query is required',
      });
    }

    const result = await completeAPIsService.getContextualInfo(query, location);
    res.json(result);
  } catch (error) {
    console.error('Contextual endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contextual information',
    });
  }
});

/**
 * GET /api/complete-apis/health
 * Health check for all APIs - used by Uptime Robot monitoring
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await completeAPIsService.getHealthStatus();

    // Return appropriate HTTP status based on overall health
    const statusCode = health.overallStatus === 'healthy' ? 200 : health.overallStatus === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      success: health.overallStatus === 'healthy',
      ...health,
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      success: false,
      overallStatus: 'down',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

/**
 * GET /api/complete-apis/cache-stats
 * Get cache statistics
 */
router.get('/cache-stats', (req: Request, res: Response) => {
  try {
    const stats = completeAPIsService.getCacheStats();
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Cache stats endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics',
    });
  }
});

/**
 * POST /api/complete-apis/clear-cache
 * Clear expired cache entries
 */
router.post('/clear-cache', (req: Request, res: Response) => {
  try {
    completeAPIsService.clearExpiredCache();
    const stats = completeAPIsService.getCacheStats();
    res.json({
      success: true,
      message: 'Expired cache entries cleared',
      stats,
    });
  } catch (error) {
    console.error('Clear cache endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
    });
  }
});

/**
 * GET /api/complete-apis/info
 * Get API information and capabilities
 */
router.get('/info', (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      service: 'SeniorShield Complete APIs Integration',
      version: '1.0.0',
      apis: {
        weather: {
          name: 'OpenWeatherMap',
          endpoint: '/weather/:city',
          description: 'Get current weather and forecasts',
          free: true,
          rateLimit: 'Unlimited (free tier)',
        },
        news: {
          name: 'NewsData.io',
          endpoint: '/news/:query',
          description: 'Get current news and events',
          free: true,
          rateLimit: '200 credits/day',
        },
        wikipedia: {
          name: 'Wikipedia',
          endpoint: '/wikipedia/:query',
          description: 'Get general knowledge and information',
          free: true,
          rateLimit: 'Unlimited (reasonable usage)',
        },
        time: {
          name: 'World Time API',
          endpoint: '/time/:timezone',
          description: 'Get current time and timezone information',
          free: true,
          rateLimit: 'Unlimited',
        },
        sports: {
          name: 'ESPN Hidden API',
          endpoint: '/sports/:query',
          description: 'Get sports scores, news, and information',
          free: true,
          rateLimit: 'Unlimited (reasonable usage)',
        },
        bible: {
          name: 'Bible API',
          endpoint: '/bible/:reference',
          description: 'Get Bible verses and passages',
          free: true,
          rateLimit: '15 requests/30 seconds',
        },
      },
      features: {
        smartCaching: 'Reduces API calls by 70%+',
        contextualDetection: 'Automatically detects which API to use',
        healthMonitoring: 'Real-time API health status',
        gracefulDegradation: 'Fallback messages when APIs unavailable',
      },
      cacheStrategy: {
        weather: '2 hours',
        news: '6 hours',
        wikipedia: '24 hours',
        time: '1 hour',
        sports: '2 hours',
        bible: '24 hours',
      },
    });
  } catch (error) {
    console.error('Info endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API information',
    });
  }
});

export default router;
