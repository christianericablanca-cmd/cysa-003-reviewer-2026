"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, FileText, BookmarkCheck, ShieldHalf, FlaskConical } from "lucide-react";
import { cn } from "@/components/ui";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/practice", label: "Practice", icon: Dumbbell },
  { href: "/exam", label: "Exam", icon: FileText },
  { href: "/review", label: "Review", icon: BookmarkCheck },
  { href: "/labs", label: "Hands-on", icon: FlaskConical },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-cyan-500 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-[#0A0F1E]"
      >
        Skip to content
      </a>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/10 bg-[#0A0F1E]/95 backdrop-blur md:flex">
        <div className="flex items-center gap-2.5 px-5 pb-6 pt-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.25)]">
            <ShieldHalf className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold leading-tight text-white">CySA+ Reviewer</p>
            <p className="font-mono text-[11px] text-cyan-400/80">CS0-003 · SOC OPS</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 px-3" aria-label="Primary">
          {NAV.map((n) => {
            const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-cyan-500/15 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.15)]"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                )}
              >
                <n.icon className="h-4.5 w-4.5" aria-hidden="true" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-2.5 px-5 pb-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="font-mono text-[11px] uppercase tracking-widest text-slate-500">Question bank</p>
            <p className="mt-1 font-mono text-sm font-bold text-slate-200">182 <span className="font-normal text-slate-500">questions</span></p>
            <p className="font-mono text-sm text-slate-400">2 <span className="text-slate-600">banks</span> · 4 <span className="text-slate-600">domains</span></p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs font-semibold text-slate-300">Pass target: 750 / 900</p>
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-slate-500">
              Estimated scaled score.
              <br />
              Not official CompTIA scoring.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0A0F1E]/95 backdrop-blur md:hidden">
        <div className="flex items-center gap-2 px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-300">
            <ShieldHalf className="h-4 w-4" />
          </span>
          <p className="text-sm font-bold text-white">CySA+ Reviewer</p>
          <p className="ml-auto font-mono text-[11px] text-cyan-400/80">CS0-003</p>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full px-4 pb-28 pt-5 sm:pt-8 md:ml-60 md:w-[calc(100%-15rem)] md:px-8 md:pb-12 lg:px-10 2xl:px-14">
        <div className="mx-auto w-full max-w-3xl lg:max-w-5xl 2xl:max-w-6xl">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Mobile"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0A0F1E]/97 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="grid grid-cols-5">
          {NAV.map((n) => {
            const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  active ? "text-cyan-300" : "text-slate-500"
                )}
              >
                <n.icon className="h-5 w-5" aria-hidden="true" />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
