"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, Boxes, Clock3, LineChart, MessageSquareText, ScanSearch, ShieldCheck, Store, Wallet, Waypoints } from "lucide-react";

const allLinks: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/budget", label: "Budget", icon: Waypoints },
  { href: "/show-mode", label: "Show", icon: ScanSearch },
  { href: "/market", label: "Market", icon: LineChart },
  { href: "/chat", label: "Partner", icon: MessageSquareText },
  { href: "/preorders", label: "Preorders", icon: Clock3 },
  { href: "/products", label: "Products", icon: Boxes },
  { href: "/singles", label: "Singles", icon: LineChart },
  { href: "/retailers", label: "Retailers", icon: Store },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/admin", label: "Admin", icon: ShieldCheck }
];

// Bottom nav: 5 most important for show-floor use
const mobileNav = [
  { href: "/show-mode", label: "Show", icon: ScanSearch },
  { href: "/singles", label: "Singles", icon: LineChart },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/chat", label: "Partner", icon: MessageSquareText },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 }
];

export function AppShell({
  children,
  title,
  subtitle
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
        {/* Sidebar — desktop only */}
        <aside className="hidden rounded-[28px] bg-ink p-5 text-white shadow-card lg:block lg:w-72">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-[0.3em] text-gold">Australia First</div>
            <h1 className="mt-2 text-2xl font-semibold">Pokemon Profit Intel</h1>
            <p className="mt-2 text-sm text-slate-300">
              Buying decisions, profit windows, and Melbourne-friendly resale strategy.
            </p>
          </div>

          <nav className="space-y-2">
            {allLinks.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href as Route}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${
                    active ? "bg-white/20 text-white font-medium" : "text-slate-200 hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1">
          <div className="rounded-[32px] border border-white/60 bg-white/80 bg-hero-grid p-5 shadow-card backdrop-blur lg:p-6">
            <div className="mb-6 flex flex-col gap-3 lg:mb-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-pine">AUD Pricing Intelligence</div>
                <h2 className="mt-2 text-2xl font-semibold text-ink lg:text-3xl">{title}</h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-600">{subtitle}</p>
              </div>
            </div>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex items-stretch">
          {mobileNav.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href as Route}
                className={`flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors ${
                  active
                    ? "text-ember border-t-2 border-ember -mt-px"
                    : "text-slate-500 hover:text-ink"
                }`}
              >
                <Icon className={`h-6 w-6 ${link.href === "/show-mode" && !active ? "text-pine" : ""}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
