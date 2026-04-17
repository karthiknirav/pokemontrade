import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/token";
import { DemoLoginButton } from "@/components/demo-login-button";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/show-mode");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[32px] bg-white shadow-card lg:grid-cols-[1.2fr_0.8fr]">

        {/* Left — brand story */}
        <div className="flex flex-col justify-between bg-ink p-8 text-white md:p-12">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.3em] text-gold">Australia · TCG</div>
            <h1 className="mt-4 text-4xl font-bold leading-tight">
              Pokemon<br />Profit Intel
            </h1>
            <p className="mt-5 text-lg font-medium text-slate-200">
              A dad &amp; son tool for the Australian Pokémon card market.
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              Born from a father teaching his son how to buy smart — not just chase hype.
              Live prices, negotiation targets, and show-floor decisions in seconds.
            </p>
          </div>

          <div className="mt-10 space-y-3 border-t border-white/10 pt-8">
            <div className="flex items-start gap-3 text-sm text-slate-300">
              <span className="mt-0.5 text-gold">✦</span>
              <span>Scan a price tag at a card show — get a fair offer in seconds</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-slate-300">
              <span className="mt-0.5 text-gold">✦</span>
              <span>Track sealed products across EB Games, Gameology &amp; Big W</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-slate-300">
              <span className="mt-0.5 text-gold">✦</span>
              <span>Know when to buy, negotiate, or walk away</span>
            </div>
          </div>
        </div>

        {/* Right — enter */}
        <div className="flex flex-col items-center justify-center p-8 md:p-12">
          <div className="w-full max-w-xs text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-ink text-3xl shadow-md">
              🃏
            </div>
            <h2 className="text-2xl font-bold text-ink">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-500">Your personal Pokemon profit partner</p>
            <div className="mt-8">
              <DemoLoginButton />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
