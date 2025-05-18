// src/controllers/provider.controller.ts
import { Request, Response } from "express";
import { prisma } from "../lib/prisma"; // adjust import path to your setup

export const getAllProviders = async (req: Request, res: Response): Promise<void> => {
  try {
    const providers = await prisma.provider.findMany({
      select: {
        id: true,
        name: true
      }
    });

    res.status(200).json({ providers });
  } catch (error) {
    console.error("Error fetching providers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
