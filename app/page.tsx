"use client";

import { useEffect, useState, useCallback } from "react";

type Project = {
  name: string;
  repo: string;
  description: string;
  languages: string[];
  isPrivate: boolean;
  commits: number;
  sizeFormatted: string;
  codeSize: string;
  lastUpdated: string;
  totalCodeBytes: number;
};

type Connection = { name: string; status: string };
type DailyActivity = { date: string; messageCount: number; sessionCount: number; toolCallCount: number };
type ModelUsage = { inputTokens: number; outputTokens: number; cacheReadInputTokens: number; cacheCreationInputTokens: number; costUSD: number };

type DashboardData = {
  user: { name: string; email: string; github: string };
  projects: Project[];
  connections: {
    mcp: Connection[];
    plugins: Connection[];
    tools: Connection[];
  };
  claudeStats: {
    totalSessions: number;
    totalMessages: number;
    dailyActivity: DailyActivity[];
    dailyModelTokens: { date: string; tokensByModel: Record<string, number> }[];
    modelUsage: Record<string, ModelUsage>;
    hourCounts: Record<string, number>;
    lastComputedDate: string;
    firstSessionDate: string;
  } | null;
  calendarEvents: { title: string; start: string; end: string }[];
  timestamp: string;
  date: string;
};

type TimeBlock = { hour: number; task: string; project?: string };

function dotColor(s: string) {
  if (s === "connected") return "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]";
  if (s === "disabled") return "bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.4)]";
  return "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]";
}

function fmtNum(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function modelShort(m: string): string {
  if (m.includes("opus-4-7")) return "Opus 4.7";
  if (m.includes("opus-4-6")) return "Opus 4.6";
  if (m.includes("sonnet-4-6")) return "Sonnet 4.6";
  if (m.includes("sonnet-4-5")) return "Sonnet 4.5";
  return m.split("-").slice(-2).join(" ");
}

function modelColor(m: string): string {
  if (m.includes("opus-4-7")) return "text-purple-300";
  if (m.includes("opus-4-6")) return "text-purple-400";
  if (m.includes("sonnet")) return "text-blue-400";
  return "text-slate-400";
}

function modelBarColor(m: string): string {
  if (m.includes("opus-4-7")) return "bg-purple-400";
  if (m.includes("opus-4-6")) return "bg-purple-500";
  if (m.includes("sonnet")) return "bg-blue-500";
  return "bg-slate-500";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const BLOCK_COLORS = [
  "bg-blue-500/25 border-blue-500/40 text-blue-300",
  "bg-purple-500/25 border-purple-500/40 text-purple-300",
  "bg-emerald-500/25 border-emerald-500/40 text-emerald-300",
  "bg-orange-500/25 border-orange-500/40 text-orange-300",
  "bg-pink-500/25 border-pink-500/40 text-pink-300",
  "bg-cyan-500/25 border-cyan-500/40 text-cyan-300",
];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [time, setTime] = useState(new Date());
  const [journal, setJournal] = useState("");
  const [savedEntries, setSavedEntries] = useState<{ time: string; text: string }[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [editingHour, setEditingHour] = useState<number | null>(null);
  const [blockInput, setBlockInput] = useState("");
  const [blockProject, setBlockProject] = useState("");
  const [statsView, setStatsView] = useState<"overview" | "daily">("overview");

  const todayKey = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    fetch("/api/data").then((r) => r.json()).then(setData);
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
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

  const saveTimeBlock = useCallback((hour: number) => {
    if (!blockInput.trim()) { setEditingHour(null); return; }
    const existing = timeBlocks.filter((b) => b.hour !== hour);
    const updated = [...existing, { hour, task: blockInput.trim(), project: blockProject || undefined }];
    updated.sort((a, b) => a.hour - b.hour);
    setTimeBlocks(updated);
    localStorage.setItem(`timeblocks-${todayKey}`, JSON.stringify(updated));
    setEditingHour(null);
    setBlockInput("");
    setBlockProject("");
  }, [blockInput, blockProject, timeBlocks, todayKey]);

  function removeTimeBlock(hour: number) {
    const updated = timeBlocks.filter((b) => b.hour !== hour);
    setTimeBlocks(updated);
    localStorage.setItem(`timeblocks-${todayKey}`, JSON.stringify(updated));
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400 text-lg">Loading dashboard...</p>
      </div>
    );
  }

  const totalCommits = data.projects.reduce((a, p) => a + p.commits, 0);
  const totalCodeBytes = data.projects.reduce((a, p) => a + p.totalCodeBytes, 0);
  const allConnections = [...data.connections.mcp, ...data.connections.plugins, ...data.connections.tools];
  const connectedCount = allConnections.filter((c) => c.status === "connected").length;

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const currentHour = time.getHours();
  const blockedHours = timeBlocks.reduce((a, b) => { a[b.hour] = b; return a; }, {} as Record<number, TimeBlock>);
  const hoursBlocked = timeBlocks.length;
  const hoursUsed = timeBlocks.filter((b) => b.hour <= currentHour).length;

  const cs = data.claudeStats;
  const todayActivity = cs?.dailyActivity?.find((d) => d.date === todayKey);
  const last7 = cs?.dailyActivity?.slice(0, 7) || [];
  const weekMessages = last7.reduce((a, d) => a + d.messageCount, 0);
  const weekSessions = last7.reduce((a, d) => a + d.sessionCount, 0);
  const totalTokens = cs ? Object.values(cs.modelUsage).reduce((a, u) => a + u.inputTokens + u.outputTokens, 0) : 0;
  const totalCacheReads = cs ? Object.values(cs.modelUsage).reduce((a, u) => a + u.cacheReadInputTokens, 0) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <h1 className="text-sm font-bold tracking-tight">HOMEBASE</h1>
          <div className="flex items-center gap-6 text-sm">
            <span className="text-slate-400">{data.date}</span>
            <span className="font-mono text-blue-400 tabular-nums">{time.toLocaleTimeString("en-GB")}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {/* Stats */}
        <section>
          <h2 className="text-3xl font-extrabold tracking-tight mb-1">{data.user.name}</h2>
          <p className="text-slate-400 mb-6">{data.user.email} &bull; github.com/{data.user.github}</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Repos", value: data.projects.length },
              { label: "Total Commits", value: totalCommits },
              { label: "Code Written", value: fmtNum(totalCodeBytes) + "B" },
              { label: "Claude Sessions", value: cs?.totalSessions || 0 },
              { label: "Connected", value: `${connectedCount}/${allConnections.length}` },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-extrabold text-blue-400">{s.value}</div>
                <div className="text-xs text-slate-500 font-medium mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Time-Blocking */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Today&apos;s Schedule</h3>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span><span className="text-blue-400 font-bold">{hoursBlocked}</span> blocked</span>
              <span><span className="text-green-400 font-bold">{hoursUsed}</span> done</span>
              <span><span className="text-yellow-400 font-bold">{24 - hoursBlocked}</span> open</span>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="grid grid-cols-1 gap-1">
              {hours.map((h) => {
                const block = blockedHours[h];
                const isPast = h < currentHour;
                const isCurrent = h === currentHour;
                const isEditing = editingHour === h;
                const colorIdx = block ? (block.hour % BLOCK_COLORS.length) : 0;

                return (
                  <div key={h} className="flex items-center gap-2 group">
                    <span className={`w-10 text-right text-xs font-mono shrink-0 ${isCurrent ? "text-blue-400 font-bold" : isPast ? "text-slate-600" : "text-slate-500"}`}>
                      {String(h).padStart(2, "0")}:00
                    </span>
                    {isCurrent ? <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0" /> : <div className="w-1.5 shrink-0" />}

                    {isEditing ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          autoFocus
                          value={blockInput}
                          onChange={(e) => setBlockInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveTimeBlock(h); if (e.key === "Escape") setEditingHour(null); }}
                          placeholder="What are you doing this hour?"
                          className="flex-1 bg-slate-800 border border-blue-500/50 rounded px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                        />
                        <select value={blockProject} onChange={(e) => setBlockProject(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300">
                          <option value="">No project</option>
                          {data.projects.map((p) => <option key={p.repo} value={p.name}>{p.name}</option>)}
                        </select>
                        <button onClick={() => saveTimeBlock(h)} className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer">Save</button>
                        <button onClick={() => setEditingHour(null)} className="text-slate-500 hover:text-slate-300 text-xs cursor-pointer">Cancel</button>
                      </div>
                    ) : block ? (
                      <div className={`flex-1 border rounded px-3 py-1.5 text-sm flex items-center justify-between ${BLOCK_COLORS[colorIdx]} ${isPast ? "opacity-50" : ""}`}>
                        <div className="flex items-center gap-2">
                          <span>{block.task}</span>
                          {block.project && <span className="text-[0.65rem] px-1.5 py-0.5 bg-white/10 rounded-full">{block.project}</span>}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingHour(h); setBlockInput(block.task); setBlockProject(block.project || ""); }} className="text-xs text-slate-400 hover:text-white cursor-pointer">Edit</button>
                          <button onClick={() => removeTimeBlock(h)} className="text-xs text-red-400 hover:text-red-300 cursor-pointer">X</button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => { if (!isPast || isCurrent) { setEditingHour(h); setBlockInput(""); setBlockProject(""); } }}
                        className={`flex-1 border border-dashed rounded px-3 py-1.5 text-sm transition-colors ${isPast ? "border-slate-800/30 text-slate-700 cursor-default" : "border-slate-700/50 text-slate-600 hover:border-blue-500/30 hover:text-slate-400 cursor-pointer"}`}
                      >
                        {isPast && !isCurrent ? "—" : "Click to plan this hour"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
                placeholder="What are you working on right now?"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button onClick={saveJournalEntry} className="bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer">Log</button>
            </div>
            {savedEntries.length > 0 ? (
              <div className="space-y-2">
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

        {/* Claude Code Usage */}
        {cs && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Claude Code Usage</h3>
              <div className="flex gap-1 bg-slate-800 rounded-lg p-0.5">
                <button onClick={() => setStatsView("overview")} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${statsView === "overview" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}>Overview</button>
                <button onClick={() => setStatsView("daily")} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${statsView === "daily" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}>Daily</button>
              </div>
            </div>

            {statsView === "overview" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                    <div className="text-2xl font-extrabold text-purple-400">{cs.totalSessions}</div>
                    <div className="text-xs text-slate-500 mt-1">Total Sessions</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                    <div className="text-2xl font-extrabold text-purple-400">{cs.totalMessages.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">Total Messages</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                    <div className="text-2xl font-extrabold text-purple-400">{fmtNum(totalTokens)}</div>
                    <div className="text-xs text-slate-500 mt-1">Tokens Generated</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                    <div className="text-2xl font-extrabold text-purple-400">{fmtNum(totalCacheReads)}</div>
                    <div className="text-xs text-slate-500 mt-1">Cache Reads</div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-slate-300 mb-4">Model Breakdown</h4>
                  <div className="space-y-4">
                    {Object.entries(cs.modelUsage)
                      .sort(([, a], [, b]) => (b.inputTokens + b.outputTokens) - (a.inputTokens + a.outputTokens))
                      .map(([model, usage]) => {
                        const tokens = usage.inputTokens + usage.outputTokens;
                        const pct = totalTokens > 0 ? Math.round((tokens / totalTokens) * 100) : 0;
                        return (
                          <div key={model}>
                            <div className="flex items-center justify-between text-sm mb-1.5">
                              <span className={`font-semibold ${modelColor(model)}`}>{modelShort(model)}</span>
                              <span className="text-slate-400">{fmtNum(tokens)} tokens ({pct}%)</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-1">
                              <div className={`h-full rounded-full ${modelBarColor(model)}`} style={{ width: `${pct}%` }} />
                            </div>
                            <div className="flex gap-4 text-[0.65rem] text-slate-500">
                              <span>{fmtNum(usage.inputTokens)} input</span>
                              <span>{fmtNum(usage.outputTokens)} output</span>
                              <span>{fmtNum(usage.cacheReadInputTokens)} cache reads</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Recent Activity</h4>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-400">{todayActivity?.messageCount || 0}</div>
                      <div className="text-[0.65rem] text-slate-500">Today&apos;s Messages</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-400">{weekMessages}</div>
                      <div className="text-[0.65rem] text-slate-500">Week Messages</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-400">{weekSessions}</div>
                      <div className="text-[0.65rem] text-slate-500">Week Sessions</div>
                    </div>
                  </div>
                  <div className="flex items-end gap-1 h-20">
                    {[...last7].reverse().map((d) => {
                      const maxMsg = Math.max(...last7.map((x) => x.messageCount), 1);
                      const barH = Math.max(4, (d.messageCount / maxMsg) * 80);
                      return (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-purple-500/60 rounded-t" style={{ height: `${barH}px` }} title={`${d.messageCount} messages`} />
                          <span className="text-[0.55rem] text-slate-600">{d.date.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h4 className="text-sm font-semibold text-slate-300 mb-4">Daily Activity Log</h4>
                <div className="space-y-2">
                  {cs.dailyActivity.slice(0, 20).map((d) => (
                    <div key={d.date} className="flex items-center gap-3 text-sm py-1.5 border-b border-slate-800/50 last:border-0">
                      <span className="text-blue-400 font-mono w-24 shrink-0">{d.date}</span>
                      <div className="flex-1 flex gap-4">
                        <span className="text-slate-300"><span className="text-purple-400 font-semibold">{d.messageCount}</span> msgs</span>
                        <span className="text-slate-300"><span className="text-purple-400 font-semibold">{d.sessionCount}</span> sessions</span>
                        <span className="text-slate-300"><span className="text-purple-400 font-semibold">{d.toolCallCount}</span> tools</span>
                      </div>
                      <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, (d.messageCount / Math.max(...cs.dailyActivity.map((x) => x.messageCount), 1)) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-[0.7rem] text-slate-600 mt-2">Stats computed: {cs.lastComputedDate}</p>
          </section>
        )}

        {/* Projects — all real GitHub data */}
        <section>
          <h3 className="text-lg font-bold mb-4">Repositories ({data.projects.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.projects.map((p) => (
              <div key={p.repo} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-sm">{p.name}</h4>
                  <div className="flex items-center gap-2">
                    {p.isPrivate ? (
                      <span className="text-[0.6rem] px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded-full">Private</span>
                    ) : (
                      <span className="text-[0.6rem] px-2 py-0.5 bg-green-500/15 text-green-400 rounded-full">Public</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-3 min-h-[2.5rem]">
                  {p.description || "No description"}
                </p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {p.languages.length > 0 ? p.languages.map((t) => (
                    <span key={t} className="text-[0.65rem] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full font-medium">{t}</span>
                  )) : (
                    <span className="text-[0.65rem] px-2 py-0.5 bg-slate-700/30 text-slate-500 rounded-full">No code yet</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-800">
                  <div>
                    <div className="text-sm font-bold text-blue-400">{p.commits}</div>
                    <div className="text-[0.6rem] text-slate-500">commits</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-blue-400">{p.codeSize}</div>
                    <div className="text-[0.6rem] text-slate-500">code</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-blue-400">{timeAgo(p.lastUpdated)}</div>
                    <div className="text-[0.6rem] text-slate-500">updated</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Connections */}
        <section>
          <h3 className="text-lg font-bold mb-4">Connections & Integrations</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "MCP Connectors", items: data.connections.mcp },
              { title: "Claude Code Plugins", items: data.connections.plugins },
              { title: "Tools & Apps", items: data.connections.tools },
            ].map((group) => (
              <div key={group.title} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h4 className="text-sm font-semibold text-blue-400 mb-4">{group.title}</h4>
                {group.items.map((c) => (
                  <div key={c.name} className="flex items-center gap-2.5 py-2 border-b border-slate-800/50 last:border-b-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor(c.status)}`} />
                    <span className={`text-sm ${c.status === "connected" ? "text-slate-200" : "text-slate-500"}`}>{c.name}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-4 text-center">
        <p className="text-xs text-slate-600">&copy; 2026 Connor Roy McKinnon Sandford</p>
      </footer>
    </div>
  );
}
