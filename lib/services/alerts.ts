import { prisma } from "@/lib/db";

export async function getAlerts(userId: string) {
  return prisma.alert.findMany({
    where: { userId },
    include: { product: true, card: true },
    orderBy: { createdAt: "desc" }
  });
}
