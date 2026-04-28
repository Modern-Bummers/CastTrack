import { Router, Request, Response, NextFunction } from "express";
import { optionalAuth } from "../middleware/auth";
import { waterbodyService } from "../services/waterbody.service";

export const waterbodyRouter = Router();

// GET /api/waterbodies — search / list
waterbodyRouter.get(
  "/",
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query, state, type, page, limit } = req.query;

      const result = await waterbodyService.search(
        query as string | undefined,
        state as string | undefined,
        type as string | undefined,
        page ? parseInt(page as string, 10) : 1,
        limit ? parseInt(limit as string, 10) : 20
      );

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/waterbodies/:id — detail page
waterbodyRouter.get(
  "/:id",
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const waterbody = await waterbodyService.getById(req.params.id as string);
      return res.json(waterbody);
    } catch (error) {
      next(error);
    }
  }
);
