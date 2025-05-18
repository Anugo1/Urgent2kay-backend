import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { getUserFromRequest } from "../types";

export const getUserSponsorships = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = getUserFromRequest(req);
    const userId = user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const sponsoredBills = await prisma.bill.findMany({
      where: {
        sponsors: {
          some: {
            id: userId,
          },
        },
      },
      include: {
        provider: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        transactions: true,
      },
    });

    res.status(200).json({
      count: sponsoredBills.length,
      data: sponsoredBills,
    });
  } catch (error) {
    console.error("Error fetching sponsorships:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
