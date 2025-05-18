import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

export class AuthService {
  async register(data: { name?: string; email: string; phone?: string; password: string; role?: "BENEFACTOR" | "BENEFACTEE"  }) {
    const { name, email, phone, password, role } = data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new Error("User already exists");

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: role || "BENEFACTEE",
      },
    });

    const token = this.generateToken(user.id);

    return { message: "User registered", token, user };
  }

  async login(data: { email: string; password: string }) {
    const { email, password } = data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) throw new Error("Invalid credentials");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid credentials");

    const token = this.generateToken(user.id);

    return { message: "Login successful", token, user };
  }

  private generateToken(userId: string) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
  }
}
