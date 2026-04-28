import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { addFavoriteSchema } from "../schemas";
import { favoriteService } from "../services/favorite.service";

export const favoriteRouter = Router();

// GET /api/favorites — list user's favorites
favoriteRouter.get(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const favorites = await favoriteService.list(req.user!.userId);
      return res.json({ data: favorites });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/favorites — add favorite
favoriteRouter.post(
  "/",
  requireAuth,
  validate(addFavoriteSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { waterbodyId } = req.body;
      const favorite = await favoriteService.add(req.user!.userId, waterbodyId);

      return res.status(201).json({
        message: "Added to favorites",
        data: favorite,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/favorites/:waterbodyId — remove favorite
favoriteRouter.delete(
  "/:waterbodyId",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await favoriteService.remove(req.user!.userId, req.params.waterbodyId as string);

      return res.json({ message: "Removed from favorites" });
    } catch (error) {
      next(error);
    }
  }
);
