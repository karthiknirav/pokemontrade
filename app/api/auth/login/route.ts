import bcrypt from "bcryptjs";

import { setSessionCookie } from "@/lib/auth/token";
import { apiError, apiOk } from "@/lib/api";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) return apiError("Invalid login details.");

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return apiError("Account not found.", 404);

  const isMatch = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!isMatch) return apiError("Incorrect password.", 401);

  await setSessionCookie({ userId: user.id, email: user.email, name: user.name });
  return apiOk({ user: { id: user.id, email: user.email, name: user.name } });
}
