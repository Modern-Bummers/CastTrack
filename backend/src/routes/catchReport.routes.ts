import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createCatchReportSchema, updateCatchReportSchema } from "../schemas";
import { catchReportService } from "../services/catchReport.service";

export const catchReportRouter = Router();

// Rate limit report submissions: 5 per 15 minutes per user
const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many reports submitted. Please try again later." },
  keyGenerator: (req) => req.user?.userId || req.ip || "anonymous",
});

// GET /api/catch-reports?waterbody_id=...  — public, browse reports
catchReportRouter.get(
  "/",
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { waterbody_id, page, limit } = req.query;

      if (!waterbody_id) {
        return res.status(400).json({ error: "waterbody_id query parameter is required" });
      }

      const result = await catchReportService.list(
        waterbody_id as string,
        page ? parseInt(page as string, 10) : 1,
        limit ? parseInt(limit as string, 10) : 20
      );

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/catch-reports/trends?waterbody_id=... — trend summaries
catchReportRouter.get(
  "/trends",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { waterbody_id } = req.query;

      if (!waterbody_id) {
        return res.status(400).json({ error: "waterbody_id query parameter is required" });
      }

      const trends = await catchReportService.getTrends(waterbody_id as string);
      return res.json(trends);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/catch-reports — submit a report (auth required)
catchReportRouter.post(
  "/",
  requireAuth,
  reportLimiter,
  validate(createCatchReportSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { waterbodyId, species, method, notes, visibility } = req.body;

      const report = await catchReportService.create(
        req.user!.userId,
        waterbodyId,
        { species, method, notes, visibility }
      );

      return res.status(201).json({
        message: "Catch report submitted",
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/catch-reports/:id — edit own report
catchReportRouter.patch(
  "/:id",
  requireAuth,
  validate(updateCatchReportSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await catchReportService.update(
        req.params.id as string,
        req.user!.userId,
        req.body
      );

      return res.json({
        message: "Report updated",
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/catch-reports/:id — delete own report
catchReportRouter.delete(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await catchReportService.delete(req.params.id as string, req.user!.userId);
      return res.json({ message: "Report deleted" });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/catch-reports/:id/flag — flag a report
catchReportRouter.post(
  "/:id/flag",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await catchReportService.flag(req.params.id as string);
      return res.json({ message: "Report flagged for review" });
    } catch (error) {
      next(error);
    }
  }
);
