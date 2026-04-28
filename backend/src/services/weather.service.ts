import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

// Cache duration in minutes
const CACHE_DURATION_MIN = 30;

export class WeatherService {
  /**
   * Get forecast for a waterbody, using cache when available.
   */
  async getForecast(waterbodyId: string) {
    const waterbody = await prisma.waterbody.findUnique({
      where: { id: waterbodyId },
    });

    if (!waterbody) {
      throw new AppError("Waterbody not found", 404);
    }

    // Check cache
    const cached = await prisma.weatherCache.findUnique({
      where: { waterbodyId },
    });

    if (cached && cached.expiresAt > new Date()) {
      return {
        source: "cache",
        fetchedAt: cached.fetchedAt,
        expiresAt: cached.expiresAt,
        forecast: cached.forecastData,
        alerts: cached.alertsData,
      };
    }

    // Fetch fresh data from NWS
    try {
      const forecast = await this.fetchFromNWS(waterbody.latitude, waterbody.longitude);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + CACHE_DURATION_MIN * 60 * 1000);

      // Upsert cache
      await prisma.weatherCache.upsert({
        where: { waterbodyId },
        update: {
          forecastData: forecast.properties || {},
          alertsData: forecast.alerts || null,
          fetchedAt: now,
          expiresAt,
        },
        create: {
          waterbodyId,
          forecastData: forecast.properties || {},
          alertsData: forecast.alerts || null,
          fetchedAt: now,
          expiresAt,
        },
      });

      return {
        source: "nws",
        fetchedAt: now,
        expiresAt,
        forecast: forecast.properties || {},
        alerts: forecast.alerts || null,
      };
    } catch (error) {
      // Graceful degradation: return stale cache if NWS is down
      if (cached) {
        return {
          source: "stale-cache",
          fetchedAt: cached.fetchedAt,
          expiresAt: cached.expiresAt,
          forecast: cached.forecastData,
          alerts: cached.alertsData,
          warning: "Weather data may be outdated — provider temporarily unavailable.",
        };
      }

      throw new AppError("Unable to fetch weather data", 503);
    }
  }

  /**
   * Call the NWS API:
   * 1. GET /points/{lat},{lon} to get the forecast endpoint URL
   * 2. GET the forecast endpoint for the actual forecast
   */
  private async fetchFromNWS(lat: number, lon: number) {
    // Step 1: Resolve grid point
    const pointUrl = `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`;
    const pointRes = await fetch(pointUrl, {
      headers: {
        "User-Agent": "(CastTrack, contact@casttrack.app)",
        Accept: "application/geo+json",
      },
    });

    if (!pointRes.ok) {
      throw new Error(`NWS points request failed: ${pointRes.status}`);
    }

    const pointData = (await pointRes.json()) as any;
    const forecastUrl = pointData.properties?.forecast;

    if (!forecastUrl) {
      throw new Error("No forecast URL returned from NWS");
    }

    // Step 2: Get forecast
    const forecastRes = await fetch(forecastUrl, {
      headers: {
        "User-Agent": "(CastTrack, contact@casttrack.app)",
        Accept: "application/geo+json",
      },
    });

    if (!forecastRes.ok) {
      throw new Error(`NWS forecast request failed: ${forecastRes.status}`);
    }

    const forecastData = (await forecastRes.json()) as any;

    // Step 3: Optionally fetch alerts
    const alertsUrl = `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`;
    let alerts = null;
    try {
      const alertsRes = await fetch(alertsUrl, {
        headers: {
          "User-Agent": "(CastTrack, contact@casttrack.app)",
          Accept: "application/geo+json",
        },
      });
      if (alertsRes.ok) {
        const alertsData = (await alertsRes.json()) as any;
        alerts = alertsData.features || [];
      }
    } catch {
      // Alerts are non-critical; continue without them
    }

    return {
      properties: forecastData.properties,
      alerts,
    };
  }
}

export const weatherService = new WeatherService();
