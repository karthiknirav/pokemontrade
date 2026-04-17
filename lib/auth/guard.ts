import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/token";

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
