import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { getSession } from "@/lib/auth/token";

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-[32px] bg-white p-8 shadow-card md:p-12">
        <div className="text-xs uppercase tracking-[0.3em] text-pine">Start Tracking</div>
        <h1 className="mt-3 text-3xl font-semibold text-ink">Create your collector account</h1>
        <p className="mt-2 text-sm text-slate-600">Save alerts, track positions, and monitor profit opportunities in AUD.</p>
        <div className="mt-6">
          <AuthForm mode="signup" />
        </div>
        <p className="mt-5 text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-pine">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
