"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Project = { name: string; repo: string; commits: number; codeSize: string; lastUpdated: string; languages: string[]; totalCodeBytes: number };
type Connection = { name: string; status: string };
type ModelUsage = { inputTokens: number; outputTokens: number; cacheReadInputTokens: number; cacheCreationInputTokens: number };
type DailyActivity = { date: string; messageCount: number; sessionCount: number };

type DashboardData = {
  user: { name: string; email: string; github: string };
  projects: Project[];
  connections: { mcp: Connection[]; plugins: Connection[]; tools: Connection[] };
  claudeStats: {
    totalSessions: number;
    totalMessages: number;
    dailyActivity: DailyActivity[];
    modelUsage: Record<string, ModelUsage>;
    lastComputedDate: string;
  } | null;
  date: string;
};

type TimeBlock = { hour: number; task: string; project?: string };

function fmtNum(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [journal, setJournal] = useState("");
  const [savedEntries, setSavedEntries] = useState<{ time: string; text: string }[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const todayKey = new Date().toISOString().slice(0, 10);
  const currentHour = new Date().getHours();

  useEffect(() => {
    fetch("/api/data").then((r) => r.json()).then(setData);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(`journal-${todayKey}`);
    if (saved) setSavedEntries(JSON.parse(saved));
    const blocks = localStorage.getItem(`timeblocks-${todayKey}`);
    if (blocks) setTimeBlocks(JSON.parse(blocks));
  }, [todayKey]);

  function saveJournalEntry() {
    if (!journal.trim()) return;
    const entry = { time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), text: journal };
    const updated = [...savedEntries, entry];
    setSavedEntries(updated);
    localStorage.setItem(`journal-${todayKey}`, JSON.stringify(updated));
    setJournal("");
  }

  if (!data) return <div className="flex-1 flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;

  const totalCommits = data.projects.reduce((a, p) => a + p.commits, 0);
  const totalCode = data.projects.reduce((a, p) => a + p.totalCodeBytes, 0);
  const allConns = [...data.connections.mcp, ...data.connections.plugins, ...data.connections.tools];
  const connCount = allConns.filter((c) => c.status === "connected").length;
  const cs = data.claudeStats;
  const totalTokens = cs ? Object.values(cs.modelUsage).reduce((a, u) => a + u.inputTokens + u.outputTokens, 0) : 0;
  const todayMsgs = cs?.dailyActivity?.find((d) => d.date === todayKey)?.messageCount || 0;
  const hoursBlocked = timeBlocks.length;

  const topProjects = [...data.projects].sort((a, b) => b.commits - a.commits).slice(0, 4);
  const nextBlocks = timeBlocks.filter((b) => b.hour >= currentHour).slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Welcome */}
      <section>
        <h2 className="text-3xl font-extrabold tracking-tight mb-1">{data.user.name}</h2>
        <p className="text-slate-400 mb-6">{data.user.email} &bull; github.com/{data.user.github}</p>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: "Repos", value: data.projects.length, href: "/projects" },
            { label: "Commits", value: totalCommits, href: "/projects" },
            { label: "Code", value: fmtNum(totalCode) + "B", href: "/projects" },
            { label: "Claude Sessions", value: cs?.totalSessions || 0, href: "/claude" },
            { label: "Tokens", value: fmtNum(totalTokens), href: "/claude" },
            { label: "Connected", value: `${connCount}/${allConns.length}`, href: "/connections" },
          ].map((s) => (
            <Link key={s.label} href={s.href} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center hover:border-slate-700 transition-colors">
              <div className="text-2xl font-extrabold text-blue-400">{s.value}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">{s.label}</div>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Schedule Preview */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Today&apos;s Schedule</h3>
            <Link href="/schedule" className="text-xs text-blue-400 hover:text-blue-300">View full schedule</Link>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-4 mb-4 text-xs text-slate-400">
              <span><span className="text-blue-400 font-bold">{hoursBlocked}</span> blocked</span>
              <span><span className="text-yellow-400 font-bold">{24 - hoursBlocked}</span> open</span>
              <span><span className="text-purple-400 font-bold">{todayMsgs}</span> Claude msgs today</span>
            </div>
            {nextBlocks.length > 0 ? (
              <div className="space-y-2">
                {nextBlocks.map((b) => (
                  <div key={b.hour} className="flex items-center gap-3 text-sm">
                    <span className={`font-mono w-12 shrink-0 ${b.hour === currentHour ? "text-blue-400 font-bold" : "text-slate-500"}`}>
                      {String(b.hour).padStart(2, "0")}:00
                    </span>
                    <span className="text-slate-200">{b.task}</span>
                    {b.project && <span className="text-[0.6rem] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded-full">{b.project}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No upcoming blocks. <Link href="/schedule" className="text-blue-400 hover:underline">Plan your day</Link></p>
            )}
          </div>
        </section>

        {/* Journal */}
        <section>
          <h3 className="text-lg font-bold mb-4">Daily Journal</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex gap-3 mb-4">
              <input
                value={journal}
                onChange={(e) => setJournal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveJournalEntry()}
                placeholder="What are you working on?"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button onClick={saveJournalEntry} className="bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer">Log</button>
            </div>
            {savedEntries.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {savedEntries.map((e, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className="text-blue-400 font-mono shrink-0">{e.time}</span>
                    <span className="text-slate-300">{e.text}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">No entries today. Start logging.</p>
            )}
          </div>
        </section>
      </div>

      {/* Top Projects */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Most Active Repos</h3>
          <Link href="/projects" className="text-xs text-blue-400 hover:text-blue-300">View all {data.projects.length} repos</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {topProjects.map((p) => (
            <div key={p.repo} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
              <h4 className="font-bold text-sm mb-2">{p.name}</h4>
              <div className="flex flex-wrap gap-1 mb-3">
                {p.languages.slice(0, 3).map((l) => (
                  <span key={l} className="text-[0.6rem] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded-full">{l}</span>
                ))}
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span className="text-blue-400 font-semibold">{p.commits}</span>
                <span>{p.codeSize}</span>
                <span>{timeAgo(p.lastUpdated)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Claude Quick Stats */}
      {cs && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Claude Code</h3>
            <Link href="/claude" className="text-xs text-blue-400 hover:text-blue-300">Full stats</Link>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-end gap-1 h-16">
              {[...(cs.dailyActivity?.slice(0, 7) || [])].reverse().map((d) => {
                const max = Math.max(...(cs.dailyActivity?.slice(0, 7).map((x) => x.messageCount) || [1]));
                const h = Math.max(4, (d.messageCount / max) * 64);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-purple-500/60 rounded-t" style={{ height: `${h}px` }} title={`${d.date}: ${d.messageCount} msgs`} />
                    <span className="text-[0.5rem] text-slate-600">{d.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-800">
              <div className="text-center"><span className="text-purple-400 font-bold">{cs.totalSessions}</span><br /><span className="text-[0.6rem] text-slate-500">sessions</span></div>
              <div className="text-center"><span className="text-purple-400 font-bold">{cs.totalMessages.toLocaleString()}</span><br /><span className="text-[0.6rem] text-slate-500">messages</span></div>
              <div className="text-center"><span className="text-purple-400 font-bold">{fmtNum(totalTokens)}</span><br /><span className="text-[0.6rem] text-slate-500">tokens</span></div>
              <div className="text-center"><span className="text-purple-400 font-bold">{todayMsgs}</span><br /><span className="text-[0.6rem] text-slate-500">today</span></div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
