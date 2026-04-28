import { Router, Request, Response, NextFunction } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createEventSchema } from "../schemas";
import { eventService } from "../services/event.service";

export const eventRouter = Router();

// GET /api/events?waterbody_id=...&region=...&include_expired=true — public, list events
eventRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { waterbody_id, region, include_expired } = req.query;

      const events = await eventService.list(
        waterbody_id as string | undefined,
        region as string | undefined,
        include_expired === "true"
      );

      return res.json({ data: events });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/events — create event (admin/moderator only)
eventRouter.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "MODERATOR"),
  validate(createEventSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = await eventService.create(req.user!.userId, req.body);

      return res.status(201).json({
        message: "Event created",
        data: event,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/events/:id — edit event
eventRouter.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "MODERATOR"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = await eventService.update(req.params.id as string, req.body);

      return res.json({
        message: "Event updated",
        data: event,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/events/:id — remove event
eventRouter.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await eventService.delete(req.params.id as string);
      return res.json({ message: "Event deleted" });
    } catch (error) {
      next(error);
    }
  }
);
