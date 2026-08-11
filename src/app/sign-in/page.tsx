import Image from "next/image";
import { redirect } from "next/navigation";
import { BarChart3, FileText, Table2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  // Demo convenience: offer the seeded accounts as one-tap fills.
  const accounts = await db.user.findMany({
    orderBy: { role: "asc" },
    select: { name: true, email: true, role: true, designation: true },
  });

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(480px,44%)]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-ink-900 lg:block">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(60rem 40rem at 15% 10%, rgba(28,163,236,0.35), transparent 60%)," +
              "radial-gradient(48rem 34rem at 85% 90%, rgba(221,163,40,0.22), transparent 60%)",
          }}
          aria-hidden
        />
        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <div className="w-fit rounded-xl bg-white/95 px-5 py-4 shadow-lifted">
            <Image
              src="/letterhead/viac_header.png"
              alt="Vision in Action Cameroon"
              width={1390}
              height={310}
              className="h-12 w-auto"
              priority
            />
          </div>

          <div className="max-w-lg">
            <h1 className="text-[42px] leading-[1.1] font-semibold tracking-[-0.03em] text-white text-balance">
              One place for every outreach session.
            </h1>
            <p className="mt-5 text-[15px] leading-7 text-ink-300">
              Log community sessions from the field notes, watch the numbers add
              themselves up, and generate standardised reports on the VIAC
              letterhead — without rebuilding a spreadsheet every month.
            </p>

            <ul className="mt-10 space-y-4">
              {[
                { icon: BarChart3, text: "A live dashboard across South West and North West" },
                { icon: FileText, text: "Monthly, quarterly, project and community reports as PDF and Word" },
                { icon: Table2, text: "The full data set exported back to Excel, any time" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-blue-300 ring-1 ring-white/10">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="text-sm leading-6 text-ink-200">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-2xs tracking-wide text-ink-500">
            Vision in Action Cameroon · REG 886/G37/D14/VOL II/SAAJP
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="brand-wash flex items-center justify-center bg-canvas px-5 py-12 sm:px-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 lg:hidden">
            <Image
              src="/letterhead/viac_header.png"
              alt="Vision in Action Cameroon"
              width={1390}
              height={310}
              className="h-11 w-auto"
              priority
            />
          </div>

          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink-900">
            Sign in
          </h2>
          <p className="mt-1.5 text-sm text-ink-500">
            Use your Vision in Action Cameroon account.
          </p>

          <SignInForm accounts={accounts} />
        </div>
      </div>
    </div>
  );
}
