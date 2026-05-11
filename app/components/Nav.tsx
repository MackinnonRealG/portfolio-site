"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/schedule", label: "Schedule" },
  { href: "/projects", label: "Projects" },
  { href: "/claude", label: "Claude Code" },
  { href: "/connections", label: "Connections" },
  { href: "/skills", label: "Skills" },
];

export default function Nav() {
  const pathname = usePathname();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const date = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-sm font-bold tracking-tight text-white hover:text-blue-400 transition-colors">
            HOMEBASE
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {LINKS.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? "bg-blue-600/20 text-blue-400"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <span className="text-slate-400 hidden sm:inline">{date}</span>
          <span className="font-mono text-blue-400 tabular-nums">{time.toLocaleTimeString("en-GB")}</span>
        </div>
      </div>
      {/* Mobile nav */}
      <div className="md:hidden border-t border-slate-800 px-4 py-2 flex gap-1 overflow-x-auto">
        {LINKS.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                active ? "bg-blue-600/20 text-blue-400" : "text-slate-400"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
