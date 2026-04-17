import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { getSession } from "@/lib/auth/token";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] bg-white shadow-card lg:grid-cols-[1.1fr_0.9fr]">
        <div className="bg-ink p-8 text-white md:p-12">
          <div className="text-xs uppercase tracking-[0.3em] text-gold">Collector Decision Platform</div>
          <h1 className="mt-4 text-4xl font-semibold">Buy smarter in the Australian Pokemon TCG market.</h1>
          <p className="mt-4 max-w-xl text-slate-300">
            Track sealed products, compare singles, score profit setups, and find better entries across AUD retailer listings.
          </p>
        </div>
        <div className="p-8 md:p-12">
          <h2 className="text-2xl font-semibold text-ink">Log in</h2>
          <p className="mt-2 text-sm text-slate-600">Demo seed account: `demo@profitintel.au` / `password123`</p>
          <div className="mt-6">
            <AuthForm mode="login" />
          </div>
          <p className="mt-5 text-sm text-slate-600">
            Need an account?{" "}
            <Link href="/signup" className="font-medium text-pine">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
