import { Router, Request, Response, NextFunction } from "express";
import { optionalAuth } from "../middleware/auth";
import { weatherService } from "../services/weather.service";

export const weatherRouter = Router();

// GET /api/weather/:waterbodyId — get forecast for a waterbody
weatherRouter.get(
  "/:waterbodyId",
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await weatherService.getForecast(req.params.waterbodyId as string);
      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
);
