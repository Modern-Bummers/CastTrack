import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { AppError } from "../middleware/errorHandler";
import { AuthPayload } from "../middleware/auth";

const SALT_ROUNDS = 12;

export class AuthService {
  /**
   * Register a new user account
   */
  async register(email: string, password: string, displayName?: string) {
    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError("Email already in use", 409);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: displayName || null,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Authenticate user and return JWT
   */
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Use same error message to prevent user enumeration
      throw new AppError("Invalid email or password", 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError("Invalid email or password", 401);
    }

    const payload: AuthPayload = {
      userId: user.id,
      role: user.role,
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    };
  }

  /**
   * Generate a password reset token and store its hash
   */
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent user enumeration
    if (!user) return;

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Return raw token — caller sends it via email
    return resetToken;
  }

  /**
   * Validate reset token and set new password
   */
  async resetPassword(token: string, newPassword: string) {
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new AppError("Invalid or expired reset token", 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetExpiry: null,
      },
    });
  }
}

export const authService = new AuthService();
