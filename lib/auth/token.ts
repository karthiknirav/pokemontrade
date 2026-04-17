import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const COOKIE_NAME = "pokemon_profit_session";

type SessionPayload = {
  userId: string;
  email: string;
  name: string;
};

export function signSession(payload: SessionPayload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");

  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export async function setSessionCookie(payload: SessionPayload) {
  const store = await cookies();
  store.set(COOKIE_NAME, signSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export async function getSession() {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    return jwt.verify(token, secret) as SessionPayload;
  } catch {
    return null;
  }
}
