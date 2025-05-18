// src/utils/authUtils.ts (or similar)
import { prisma } from "../lib/prisma"; // adjust path as needed

export const findOrCreateUser = async (profile: any, role: string) => {
  const email = profile.emails[0].value;
  const googleId = profile.id;

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: profile.displayName,
        googleId,
        role: role.toUpperCase() as "BENEFACTOR" | "BENEFACTEE",
      },
    });
  }

  return user;
};
