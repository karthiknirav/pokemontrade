import { getSession } from "@/lib/auth/token";
import { apiOk } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return apiOk(await prisma.tcgSet.findMany({ orderBy: { releaseDate: "desc" } }));
}
