import { AlertForm } from "@/components/alert-form";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { getAlerts } from "@/lib/services/alerts";

export default async function AlertsPage() {
  const session = await requireSession();
  const alerts = await getAlerts(session.userId);
  const products = await prisma.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });

  return (
    <AppShell title="Alerts" subtitle="Set buy-under, restock, and value-buy triggers so the app can surface the right move quickly.">
      <AlertForm products={products} />
      <div className="mt-8 space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="rounded-3xl border border-mist bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
              <div>
                <div className="font-medium">{alert.product?.name ?? alert.card?.name}</div>
                <div className="text-sm text-slate-500">
                  {alert.type} · {alert.status}
                </div>
              </div>
              <div className="text-sm text-slate-600">{alert.notes}</div>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
