/**
 * SeniorShield Complete APIs Integration Service
 * Integrates 6 free APIs with smart caching, health monitoring, and graceful degradation
 * 
 * APIs:
 * 1. OpenWeatherMap - Weather forecasts
 * 2. NewsData.io - Current news and events
 * 3. Wikipedia - General knowledge
 * 4. World Time API - Time zones and current time
 * 5. ESPN Hidden API - Sports scores and news
 * 6. Bible API - Bible verses
 */

import axios, { AxiosError } from 'axios';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface APIHealth {
  status: 'healthy' | 'degraded' | 'down';
  lastChecked: string;
  responseTime: number;
  error?: string;
}

interface HealthCheckResult {
  overallStatus: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  apis: {
    weather: APIHealth;
    news: APIHealth;
    wikipedia: APIHealth;
    time: APIHealth;
    sports: APIHealth;
    bible: APIHealth;
  };
  cacheStats: {
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
  };
}

class CompleteAPIsService {
  private cache: Map<string, CacheEntry> = new Map();
  private apiHealth: Map<string, APIHealth> = new Map();
  private lastHealthCheck: number = 0;

  // API Keys from environment
  private weatherApiKey: string;
  private newsApiKey: string;

  // Cache TTLs (in milliseconds)
  private readonly CACHE_TTL = {
    weather: 2 * 60 * 60 * 1000, // 2 hours
    news: 6 * 60 * 60 * 1000, // 6 hours
    wikipedia: 24 * 60 * 60 * 1000, // 24 hours
    sports: 2 * 60 * 60 * 1000, // 2 hours
    bible: 24 * 60 * 60 * 1000, // 24 hours
    time: 60 * 60 * 1000, // 1 hour
  };

  // API Base URLs
  private readonly API_URLS = {
    weather: 'https://api.openweathermap.org/data/2.5/weather',
    news: 'https://newsdata.io/api/1/latest',
    wikipedia: 'https://en.wikipedia.org/w/api.php',
    time: 'https://time.now/developer/api',
    espn: 'http://site.api.espn.com/apis/site/v2',
    bible: 'https://bible-api.com',
  };

  constructor(weatherKey: string, newsKey: string) {
    this.weatherApiKey = weatherKey;
    this.newsApiKey = newsKey;
    this.initializeHealthChecks();
  }

  /**
   * Initialize health checks for all APIs
   */
  private initializeHealthChecks(): void {
    const apis = ['weather', 'news', 'wikipedia', 'time', 'sports', 'bible'];
    apis.forEach((api) => {
      this.apiHealth.set(api, {
        status: 'healthy',
        lastChecked: new Date().toISOString(),
        responseTime: 0,
      });
    });
  }

  /**
   * Get from cache if available and not expired
   */
  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache entry with TTL
   */
  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Record API health status
   */
  private recordHealth(
    apiName: string,
    status: 'healthy' | 'degraded' | 'down',
    responseTime: number,
    error?: string
  ): void {
    this.apiHealth.set(apiName, {
      status,
      lastChecked: new Date().toISOString(),
      responseTime,
      error,
    });
  }

  /**
   * Get Weather Information
   */
  async getWeather(city: string): Promise<any> {
    const cacheKey = `weather:${city.toLowerCase()}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return { ...cached, fromCache: true };

    try {
      const startTime = Date.now();
      const response = await axios.get(this.API_URLS.weather, {
        params: {
          q: city,
          appid: this.weatherApiKey,
          units: 'metric',
        },
        timeout: 5000,
      });

      const responseTime = Date.now() - startTime;
      this.recordHealth('weather', 'healthy', responseTime);

      const data = {
        success: true,
        city: response.data.name,
        temperature: Math.round(response.data.main.temp),
        feelsLike: Math.round(response.data.main.feels_like),
        condition: response.data.weather[0].main,
        description: response.data.weather[0].description,
        humidity: response.data.main.humidity,
        windSpeed: Math.round(response.data.wind.speed),
        cloudiness: response.data.clouds.all,
      };

      this.setCache(cacheKey, data, this.CACHE_TTL.weather);
      return data;
    } catch (error) {
      const errorMsg = error instanceof AxiosError ? error.message : String(error);
      this.recordHealth('weather', 'down', 0, errorMsg);
      return {
        success: false,
        error: 'Weather service temporarily unavailable',
      };
    }
  }

  /**
   * Get News Information
   */
  async getNews(query: string, country: string = 'us'): Promise<any> {
    const cacheKey = `news:${query.toLowerCase()}:${country}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return { ...cached, fromCache: true };

    try {
      const startTime = Date.now();
      const params: Record<string, string> = {
          q: query,
          apikey: this.newsApiKey,
          language: 'en',
        };
      if (country) params.country = country;

      const response = await axios.get(this.API_URLS.news, {
        params,
        timeout: 8000,
      });

      const responseTime = Date.now() - startTime;
      this.recordHealth('news', 'healthy', responseTime);

      const articles = (response.data.results || []).slice(0, 3).map((article: any) => ({
        title: article.title,
        description: article.description || article.content,
        source: article.source_id,
        publishedAt: article.pubDate,
        url: article.link,
      }));

      const data = {
        success: true,
        query,
        articles,
        count: articles.length,
      };

      this.setCache(cacheKey, data, this.CACHE_TTL.news);
      return data;
    } catch (error) {
      const errorMsg = error instanceof AxiosError ? error.message : String(error);
      this.recordHealth('news', 'down', 0, errorMsg);
      return {
        success: false,
        error: 'News service temporarily unavailable',
      };
    }
  }

  /**
   * Get Wikipedia Information
   */
  async searchWikipedia(query: string): Promise<any> {
    const cacheKey = `wikipedia:${query.toLowerCase()}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return { ...cached, fromCache: true };

    try {
      const startTime = Date.now();
      const response = await axios.get(this.API_URLS.wikipedia, {
        params: {
          action: 'query',
          titles: query,
          prop: 'extracts',
          explaintext: true,
          format: 'json',
          origin: '*',
        },
        headers: {
          'User-Agent': 'SeniorShield/1.0 (seniorshield@example.com)',
        },
        timeout: 5000,
      });

      const responseTime = Date.now() - startTime;
      this.recordHealth('wikipedia', 'healthy', responseTime);

      const pages = response.data.query.pages;
      const page = Object.values(pages)[0] as any;

      if (page.missing) {
        return {
          success: false,
          error: `No Wikipedia article found for "${query}"`,
        };
      }

      const summary = page.extract ? page.extract.substring(0, 500) : '';

      const data = {
        success: true,
        title: page.title,
        summary,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
      };

      this.setCache(cacheKey, data, this.CACHE_TTL.wikipedia);
      return data;
    } catch (error) {
      const errorMsg = error instanceof AxiosError ? error.message : String(error);
      this.recordHealth('wikipedia', 'down', 0, errorMsg);
      return {
        success: false,
        error: 'Wikipedia service temporarily unavailable',
      };
    }
  }

  /**
   * Get Time Information
   */
  async getTime(timezone: string): Promise<any> {
    const cacheKey = `time:${timezone}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return { ...cached, fromCache: true };

    try {
      const startTime = Date.now();
      const response = await axios.get(`${this.API_URLS.time}/timezone/${timezone}`, {
        timeout: 5000,
      });

      const responseTime = Date.now() - startTime;
      this.recordHealth('time', 'healthy', responseTime);

      const data = {
        success: true,
        timezone: response.data.timezone,
        datetime: response.data.datetime,
        abbreviation: response.data.abbreviation,
        utcOffset: response.data.utc_offset,
        isDST: response.data.dst,
      };

      this.setCache(cacheKey, data, this.CACHE_TTL.time);
      return data;
    } catch (error) {
      const errorMsg = error instanceof AxiosError ? error.message : String(error);
      this.recordHealth('time', 'down', 0, errorMsg);
      return {
        success: false,
        error: 'Time service temporarily unavailable',
      };
    }
  }

  /**
   * Get Sports Information (ESPN)
   */
  async getSportsInfo(query: string): Promise<any> {
    const cacheKey = `sports:${query.toLowerCase()}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return { ...cached, fromCache: true };

    try {
      const startTime = Date.now();

      // Detect sport type from query
      let endpoint = '';
      if (query.toLowerCase().includes('nfl') || query.toLowerCase().includes('football')) {
        endpoint = `${this.API_URLS.espn}/sports/football/nfl/scoreboard`;
      } else if (query.toLowerCase().includes('nba') || query.toLowerCase().includes('basketball')) {
        endpoint = `${this.API_URLS.espn}/sports/basketball/nba/scoreboard`;
      } else if (query.toLowerCase().includes('mlb') || query.toLowerCase().includes('baseball')) {
        endpoint = `${this.API_URLS.espn}/sports/baseball/mlb/scoreboard`;
      } else if (query.toLowerCase().includes('nhl') || query.toLowerCase().includes('hockey')) {
        endpoint = `${this.API_URLS.espn}/sports/hockey/nhl/scoreboard`;
      } else {
        // Default to NFL
        endpoint = `${this.API_URLS.espn}/sports/football/nfl/scoreboard`;
      }

      const response = await axios.get(endpoint, { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      this.recordHealth('sports', 'healthy', responseTime);

      const events = (response.data.events || []).slice(0, 3).map((event: any) => ({
        sport: event.sport?.displayName || 'Unknown',
        homeTeam: event.competitions?.[0]?.competitors?.[0]?.team?.displayName || 'Unknown',
        awayTeam: event.competitions?.[0]?.competitors?.[1]?.team?.displayName || 'Unknown',
        homeScore: event.competitions?.[0]?.competitors?.[0]?.score || 0,
        awayScore: event.competitions?.[0]?.competitors?.[1]?.score || 0,
        status: event.status?.type?.description || 'Scheduled',
        date: event.date,
      }));

      const data = {
        success: true,
        query,
        events,
        count: events.length,
      };

      this.setCache(cacheKey, data, this.CACHE_TTL.sports);
      return data;
    } catch (error) {
      const errorMsg = error instanceof AxiosError ? error.message : String(error);
      this.recordHealth('sports', 'down', 0, errorMsg);
      return {
        success: false,
        error: 'Sports service temporarily unavailable',
      };
    }
  }

  /**
   * Get Bible Verse
   */
  async getBibleVerse(reference: string, translation: string = 'kjv'): Promise<any> {
    const cacheKey = `bible:${reference.toLowerCase()}:${translation}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return { ...cached, fromCache: true };

    try {
      const startTime = Date.now();
      const response = await axios.get(`${this.API_URLS.bible}/${reference}`, {
        params: { translation },
        timeout: 5000,
      });

      const responseTime = Date.now() - startTime;
      this.recordHealth('bible', 'healthy', responseTime);

      const data = {
        success: true,
        reference: response.data.reference,
        text: response.data.text,
        translation: response.data.translation,
      };

      this.setCache(cacheKey, data, this.CACHE_TTL.bible);
      return data;
    } catch (error) {
      const errorMsg = error instanceof AxiosError ? error.message : String(error);
      this.recordHealth('bible', 'down', 0, errorMsg);
      return {
        success: false,
        error: 'Bible service temporarily unavailable',
      };
    }
  }

  /**
   * Smart contextual query - detects which API to use
   */
  async getContextualInfo(query: string, location?: string): Promise<any> {
    const lowerQuery = query.toLowerCase();

    // Weather detection
    if (
      lowerQuery.includes('weather') ||
      lowerQuery.includes('forecast') ||
      lowerQuery.includes('rain') ||
      lowerQuery.includes('temperature') ||
      lowerQuery.includes('cold') ||
      lowerQuery.includes('hot')
    ) {
      const city = location || 'New York';
      return {
        source: 'weather',
        data: await this.getWeather(city),
      };
    }

    // Sports detection
    if (
      lowerQuery.includes('score') ||
      lowerQuery.includes('game') ||
      lowerQuery.includes('nfl') ||
      lowerQuery.includes('nba') ||
      lowerQuery.includes('mlb') ||
      lowerQuery.includes('nhl') ||
      lowerQuery.includes('football') ||
      lowerQuery.includes('basketball') ||
      lowerQuery.includes('baseball') ||
      lowerQuery.includes('hockey') ||
      lowerQuery.includes('team') ||
      lowerQuery.includes('player')
    ) {
      return {
        source: 'sports',
        data: await this.getSportsInfo(query),
      };
    }

    // News detection
    if (
      lowerQuery.includes('news') ||
      lowerQuery.includes('happened') ||
      lowerQuery.includes('today') ||
      lowerQuery.includes('current') ||
      lowerQuery.includes('latest')
    ) {
      return {
        source: 'news',
        data: await this.getNews(query),
      };
    }

    // Time detection
    if (lowerQuery.includes('time') || lowerQuery.includes('timezone')) {
      const timezone = location || 'America/New_York';
      return {
        source: 'time',
        data: await this.getTime(timezone),
      };
    }

    // Bible detection
    if (lowerQuery.includes('bible') || lowerQuery.includes('verse') || lowerQuery.includes('scripture')) {
      return {
        source: 'bible',
        data: await this.getBibleVerse(query),
      };
    }

    // Default to Wikipedia for general knowledge
    return {
      source: 'wikipedia',
      data: await this.searchWikipedia(query),
    };
  }

  /**
   * Get health status of all APIs
   */
  async getHealthStatus(): Promise<HealthCheckResult> {
    const now = Date.now();

    // Only do full health check every 5 minutes
    if (now - this.lastHealthCheck < 5 * 60 * 1000) {
      return this.buildHealthResult();
    }

    // Perform quick health checks
    await Promise.all([
      this.getWeather('New York').catch(() => null),
      this.getNews('technology').catch(() => null),
      this.searchWikipedia('Python').catch(() => null),
      this.getTime('America/New_York').catch(() => null),
      this.getSportsInfo('NFL').catch(() => null),
      this.getBibleVerse('John 3:16').catch(() => null),
    ]);

    this.lastHealthCheck = now;
    return this.buildHealthResult();
  }

  /**
   * Build health check result
   */
  private buildHealthResult(): HealthCheckResult {
    const apis = {
      weather: this.apiHealth.get('weather') || { status: 'down', lastChecked: '', responseTime: 0 },
      news: this.apiHealth.get('news') || { status: 'down', lastChecked: '', responseTime: 0 },
      wikipedia: this.apiHealth.get('wikipedia') || { status: 'down', lastChecked: '', responseTime: 0 },
      time: this.apiHealth.get('time') || { status: 'down', lastChecked: '', responseTime: 0 },
      sports: this.apiHealth.get('sports') || { status: 'down', lastChecked: '', responseTime: 0 },
      bible: this.apiHealth.get('bible') || { status: 'down', lastChecked: '', responseTime: 0 },
    };

    const downCount = Object.values(apis).filter((a) => a.status === 'down').length;
    const overallStatus: 'healthy' | 'degraded' | 'down' = downCount === 0 ? 'healthy' : downCount < 3 ? 'degraded' : 'down';

    const cacheStats = {
      totalEntries: this.cache.size,
      validEntries: Array.from(this.cache.values()).filter((e) => Date.now() - e.timestamp <= e.ttl).length,
      expiredEntries: Array.from(this.cache.values()).filter((e) => Date.now() - e.timestamp > e.ttl).length,
    };

    return {
      overallStatus,
      timestamp: new Date().toISOString(),
      apis,
      cacheStats,
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    const validEntries = Array.from(this.cache.values()).filter(
      (e) => Date.now() - e.timestamp <= e.ttl
    ).length;
    const expiredEntries = this.cache.size - validEntries;

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
    };
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));
  }
}

export default CompleteAPIsService;
