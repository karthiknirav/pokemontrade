import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/token";

export default async function HomePage() {
  const session = await getSession();
  redirect(session ? "/show-mode" : "/login");
}
