"use client";

import { useEffect, useState } from "react";

type ModelUsage = { inputTokens: number; outputTokens: number; cacheReadInputTokens: number; cacheCreationInputTokens: number };
type DailyActivity = { date: string; messageCount: number; sessionCount: number; toolCallCount: number };
type LimitInfo = { used: number; label: string; resetNote: string };
type PlanUsage = {
  plan: string;
  weeklyReset: string;
  extraUsage: boolean;
  limits: Record<string, LimitInfo>;
  features: { routineRuns: { used: number; total: number } };
  lastUpdated: string;
};

type ClaudeStats = {
  totalSessions: number;
  totalMessages: number;
  dailyActivity: DailyActivity[];
  dailyModelTokens: { date: string; tokensByModel: Record<string, number> }[];
  modelUsage: Record<string, ModelUsage>;
  hourCounts: Record<string, number>;
  lastComputedDate: string;
  firstSessionDate: string;
};

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
  return m;
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

function UsageBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.max(pct, 1)}%` }} />
    </div>
  );
}

export default function ClaudePage() {
  const [cs, setCs] = useState<ClaudeStats | null>(null);
  const [plan, setPlan] = useState<PlanUsage | null>(null);
  const [view, setView] = useState<"overview" | "daily" | "hourly">("overview");
  const todayKey = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    fetch("/api/data").then((r) => r.json()).then((d) => {
      setCs(d.claudeStats);
      setPlan(d.planUsage);
    });
  }, []);

  if (!cs) return <div className="flex-1 flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;

  const totalTokens = Object.values(cs.modelUsage).reduce((a, u) => a + u.inputTokens + u.outputTokens, 0);
  const totalCacheReads = Object.values(cs.modelUsage).reduce((a, u) => a + u.cacheReadInputTokens, 0);
  const todayActivity = cs.dailyActivity?.find((d) => d.date === todayKey);
  const last7 = cs.dailyActivity?.slice(0, 7) || [];
  const weekMessages = last7.reduce((a, d) => a + d.messageCount, 0);
  const weekSessions = last7.reduce((a, d) => a + d.sessionCount, 0);
  const peakHour = Object.entries(cs.hourCounts || {}).sort(([, a], [, b]) => b - a)[0];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Claude Code Usage</h2>
          <p className="text-slate-400 text-sm mt-1">
            {plan ? `${plan.plan} Plan` : "Loading plan..."} &bull; Stats from {cs.firstSessionDate || "local sessions"}
          </p>
        </div>
        <div className="flex gap-1 bg-slate-800 rounded-lg p-0.5">
          {(["overview", "daily", "hourly"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer capitalize ${view === v ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}>{v}</button>
          ))}
        </div>
      </div>

      {/* Plan Usage Limits */}
      {plan && (
        <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h4 className="text-sm font-semibold text-slate-300">Plan Usage Limits</h4>
              <span className="text-[0.65rem] px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full font-semibold">{plan.plan}</span>
              {plan.extraUsage && <span className="text-[0.65rem] px-2 py-0.5 bg-green-500/15 text-green-400 rounded-full">Extra Usage On</span>}
            </div>
            <span className="text-[0.65rem] text-slate-500">Resets {plan.weeklyReset}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(plan.limits).map((limit) => (
              <div key={limit.label}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-slate-300">{limit.label}</span>
                  <span className={`font-bold ${limit.used > 50 ? "text-orange-400" : limit.used > 0 ? "text-blue-400" : "text-slate-500"}`}>{limit.used}% used</span>
                </div>
                <UsageBar pct={limit.used} color={limit.used > 50 ? "bg-orange-500" : "bg-blue-500"} />
                {limit.resetNote && <p className="text-[0.6rem] text-slate-600 mt-1">{limit.resetNote}</p>}
              </div>
            ))}
          </div>
          {plan.features?.routineRuns && (
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Daily Routine Runs</span>
                <span className="text-blue-400 font-bold">{plan.features.routineRuns.used} / {plan.features.routineRuns.total}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Session Stats */}
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

      {view === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden mb-1.5">
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
            <div className="flex items-end gap-1 h-24">
              {[...last7].reverse().map((d) => {
                const max = Math.max(...last7.map((x) => x.messageCount), 1);
                const h = Math.max(4, (d.messageCount / max) * 96);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[0.55rem] text-purple-400">{d.messageCount}</span>
                    <div className="w-full bg-purple-500/60 rounded-t" style={{ height: `${h}px` }} />
                    <span className="text-[0.55rem] text-slate-600">{d.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
            {peakHour && (
              <p className="text-xs text-slate-500 mt-4">Peak hour: <span className="text-purple-400 font-semibold">{peakHour[0].padStart(2, "0")}:00</span> ({peakHour[1]} sessions)</p>
            )}
          </div>
        </div>
      )}

      {view === "daily" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-slate-300 mb-4">Daily Activity Log</h4>
          <div className="space-y-2">
            {cs.dailyActivity.slice(0, 30).map((d) => {
              const max = Math.max(...cs.dailyActivity.map((x) => x.messageCount), 1);
              return (
                <div key={d.date} className="flex items-center gap-3 text-sm py-2 border-b border-slate-800/50 last:border-0">
                  <span className="text-blue-400 font-mono w-24 shrink-0">{d.date}</span>
                  <div className="flex-1 flex gap-4">
                    <span className="text-slate-300"><span className="text-purple-400 font-semibold">{d.messageCount}</span> msgs</span>
                    <span className="text-slate-300"><span className="text-purple-400 font-semibold">{d.sessionCount}</span> sessions</span>
                    <span className="text-slate-300"><span className="text-purple-400 font-semibold">{d.toolCallCount}</span> tools</span>
                  </div>
                  <div className="w-40 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(d.messageCount / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "hourly" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-slate-300 mb-4">Activity by Hour</h4>
          <div className="flex items-end gap-1 h-40">
            {Array.from({ length: 24 }, (_, i) => {
              const count = cs.hourCounts?.[String(i)] || 0;
              const max = Math.max(...Object.values(cs.hourCounts || {}), 1);
              const h = Math.max(2, (count / max) * 140);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  {count > 0 && <span className="text-[0.55rem] text-purple-400">{count}</span>}
                  <div className={`w-full rounded-t ${count > 0 ? "bg-purple-500/60" : "bg-slate-800"}`} style={{ height: `${h}px` }} />
                  <span className="text-[0.55rem] text-slate-600">{String(i).padStart(2, "0")}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-4">Sessions by hour of day (all time)</p>
        </div>
      )}
    </div>
  );
}
