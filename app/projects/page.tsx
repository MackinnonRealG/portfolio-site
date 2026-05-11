"use client";

import { useEffect, useState } from "react";

type Project = {
  name: string; repo: string; description: string; languages: string[];
  isPrivate: boolean; commits: number; sizeFormatted: string; codeSize: string;
  lastUpdated: string; totalCodeBytes: number;
};

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function fmtBytes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sort, setSort] = useState<"commits" | "code" | "updated">("commits");

  useEffect(() => {
    fetch("/api/data").then((r) => r.json()).then((d) => setProjects(d.projects));
  }, []);

  const sorted = [...projects].sort((a, b) => {
    if (sort === "commits") return b.commits - a.commits;
    if (sort === "code") return b.totalCodeBytes - a.totalCodeBytes;
    return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
  });

  const totalCommits = projects.reduce((a, p) => a + p.commits, 0);
  const totalCode = projects.reduce((a, p) => a + p.totalCodeBytes, 0);
  const allLangs = [...new Set(projects.flatMap((p) => p.languages))];

  if (!projects.length) return <div className="flex-1 flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Repositories ({projects.length})</h2>
          <p className="text-slate-400 text-sm mt-1">{totalCommits} commits &bull; {fmtBytes(totalCode)} bytes of code &bull; {allLangs.length} languages</p>
        </div>
        <div className="flex gap-1 bg-slate-800 rounded-lg p-0.5">
          {(["commits", "code", "updated"] as const).map((s) => (
            <button key={s} onClick={() => setSort(s)} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${sort === s ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}>
              {s === "commits" ? "Most Commits" : s === "code" ? "Most Code" : "Recently Updated"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((p) => (
          <div key={p.repo} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-sm">{p.name}</h4>
              {p.isPrivate ? (
                <span className="text-[0.6rem] px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded-full">Private</span>
              ) : (
                <span className="text-[0.6rem] px-2 py-0.5 bg-green-500/15 text-green-400 rounded-full">Public</span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-3 min-h-[2.5rem]">{p.description || "No description"}</p>
            <div className="flex flex-wrap gap-1 mb-3">
              {p.languages.length > 0 ? p.languages.map((t) => (
                <span key={t} className="text-[0.65rem] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full font-medium">{t}</span>
              )) : (
                <span className="text-[0.65rem] px-2 py-0.5 bg-slate-700/30 text-slate-500 rounded-full">No code yet</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-slate-800">
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
    </div>
  );
}
