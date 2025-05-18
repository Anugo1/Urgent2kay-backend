// src/middlewares/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

export const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
const user = await prisma.user.findUnique({ where: { id: decoded.userId } });



    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    req.user = user; // this works because of your custom type declaration
    next(); // ✅ must call next() or return
  } catch (error) {
    console.log(error)
    res.status(401).json({ error: "Invalid token" });
  }
};

