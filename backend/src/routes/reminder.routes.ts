import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createReminderSchema, updateReminderSchema } from "../schemas";
import { reminderService } from "../services/reminder.service";

export const reminderRouter = Router();

// GET /api/reminders — get user's reminders
reminderRouter.get(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reminders = await reminderService.list(req.user!.userId);
      return res.json({ data: reminders });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/reminders — create reminder
reminderRouter.post(
  "/",
  requireAuth,
  validate(createReminderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reminder = await reminderService.create(req.user!.userId, req.body);

      return res.status(201).json({
        message: "Reminder created",
        data: reminder,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/reminders/:id — update reminder
reminderRouter.patch(
  "/:id",
  requireAuth,
  validate(updateReminderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reminder = await reminderService.update(
        req.params.id as string,
        req.user!.userId,
        req.body
      );

      return res.json({
        message: "Reminder updated",
        data: reminder,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/reminders/:id — delete reminder
reminderRouter.delete(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await reminderService.delete(req.params.id as string, req.user!.userId);
      return res.json({ message: "Reminder deleted" });
    } catch (error) {
      next(error);
    }
  }
);
