import bcrypt from "bcryptjs";

import { setSessionCookie } from "@/lib/auth/token";
import { apiError, apiOk } from "@/lib/api";
import { prisma } from "@/lib/db";
import { signupSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) return apiError("Invalid signup details.");

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return apiError("Email already in use.");

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash
    }
  });

  await setSessionCookie({ userId: user.id, email: user.email, name: user.name });
  return apiOk({ user: { id: user.id, email: user.email, name: user.name } }, 201);
}
