import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

export class CatchReportService {
  /**
   * List catch reports for a waterbody with pagination
   */
  async list(waterbodyId?: string, page = 1, limit = 20) {
    const where: any = { flagged: false };

    if (waterbodyId) {
      where.waterbodyId = waterbodyId;
    }

    const [reports, total] = await Promise.all([
      prisma.catchReport.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, displayName: true },
          },
        },
      }),
      prisma.catchReport.count({ where }),
    ]);

    // Mask user info on anonymous reports
    const masked = reports.map((r) => ({
      ...r,
      user: r.visibility === "ANONYMOUS" ? null : r.user,
    }));

    return {
      data: masked,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * List a single user's own catch reports across all waterbodies.
   * Includes the waterbody name so the frontend can show where each was caught.
   */
  async listForUser(userId: string, page = 1, limit = 20) {
    const where = { userId };

    const [reports, total] = await Promise.all([
      prisma.catchReport.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          waterbody: {
            select: { id: true, name: true, state: true, type: true },
          },
        },
      }),
      prisma.catchReport.count({ where }),
    ]);

    return {
      data: reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Submit a new catch report
   */
  async create(
    userId: string,
    waterbodyId: string,
    data: { species: string; method: string; notes?: string; visibility?: "PUBLIC" | "ANONYMOUS" }
  ) {
    return prisma.catchReport.create({
      data: {
        userId,
        waterbodyId,
        species: data.species,
        method: data.method,
        notes: data.notes || null,
        visibility: data.visibility || "PUBLIC",
      },
    });
  }

  /**
   * Edit own report
   */
  async update(reportId: string, userId: string, data: Partial<{ species: string; method: string; notes: string; visibility: "PUBLIC" | "ANONYMOUS" }>) {
    const report = await prisma.catchReport.findUnique({ where: { id: reportId } });

    if (!report) throw new AppError("Report not found", 404);
    if (report.userId !== userId) throw new AppError("Not authorized", 403);

    return prisma.catchReport.update({
      where: { id: reportId },
      data,
    });
  }

  /**
   * Delete own report
   */
  async delete(reportId: string, userId: string) {
    const report = await prisma.catchReport.findUnique({ where: { id: reportId } });

    if (!report) throw new AppError("Report not found", 404);
    if (report.userId !== userId) throw new AppError("Not authorized", 403);

    await prisma.catchReport.delete({ where: { id: reportId } });
  }

  /**
   * Flag a report for moderator review
   */
  async flag(reportId: string) {
    const report = await prisma.catchReport.findUnique({ where: { id: reportId } });
    if (!report) throw new AppError("Report not found", 404);

    await prisma.catchReport.update({
      where: { id: reportId },
      data: { flagged: true },
    });
  }

  /**
   * Get trend summaries for a waterbody (7-day and 30-day)
   */
  async getTrends(waterbodyId?: string) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [weeklyReports, monthlyReports] = await Promise.all([
      prisma.catchReport.findMany({
        where: {
          waterbodyId,
          flagged: false,
          createdAt: { gte: sevenDaysAgo },
        },
        select: { species: true, method: true },
      }),
      prisma.catchReport.findMany({
        where: {
          waterbodyId,
          flagged: false,
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { species: true, method: true },
      }),
    ]);

    return {
      weekly: {
        totalReports: weeklyReports.length,
        topSpecies: this.getTopItems(weeklyReports.map((r) => r.species)),
        topMethods: this.getTopItems(weeklyReports.map((r) => r.method)),
      },
      monthly: {
        totalReports: monthlyReports.length,
        topSpecies: this.getTopItems(monthlyReports.map((r) => r.species)),
        topMethods: this.getTopItems(monthlyReports.map((r) => r.method)),
      },
    };
  }

  /**
   * Count occurrences and return top 5
   */
  private getTopItems(items: string[]) {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item] = (counts[item] || 0) + 1;
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }
}

export const catchReportService = new CatchReportService();
