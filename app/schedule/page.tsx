"use client";

import { useEffect, useState, useCallback } from "react";

type Project = { name: string; repo: string };
type TimeBlock = { hour: number; task: string; project?: string };

const BLOCK_COLORS = [
  "bg-blue-500/25 border-blue-500/40 text-blue-300",
  "bg-purple-500/25 border-purple-500/40 text-purple-300",
  "bg-emerald-500/25 border-emerald-500/40 text-emerald-300",
  "bg-orange-500/25 border-orange-500/40 text-orange-300",
  "bg-pink-500/25 border-pink-500/40 text-pink-300",
  "bg-cyan-500/25 border-cyan-500/40 text-cyan-300",
];

export default function SchedulePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [time, setTime] = useState(new Date());
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [editingHour, setEditingHour] = useState<number | null>(null);
  const [blockInput, setBlockInput] = useState("");
  const [blockProject, setBlockProject] = useState("");
  const todayKey = new Date().toISOString().slice(0, 10);
  const currentHour = time.getHours();

  useEffect(() => {
    fetch("/api/data").then((r) => r.json()).then((d) => setProjects(d.projects));
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const blocks = localStorage.getItem(`timeblocks-${todayKey}`);
    if (blocks) setTimeBlocks(JSON.parse(blocks));
  }, [todayKey]);

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

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const blockedHours = timeBlocks.reduce((a, b) => { a[b.hour] = b; return a; }, {} as Record<number, TimeBlock>);
  const hoursBlocked = timeBlocks.length;
  const hoursUsed = timeBlocks.filter((b) => b.hour <= currentHour).length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Today&apos;s Schedule</h2>
          <p className="text-slate-400 text-sm mt-1">Plan every hour. Track your accountability.</p>
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-400">
          <span><span className="text-blue-400 font-bold text-lg">{hoursBlocked}</span> blocked</span>
          <span><span className="text-green-400 font-bold text-lg">{hoursUsed}</span> done</span>
          <span><span className="text-yellow-400 font-bold text-lg">{24 - hoursBlocked}</span> open</span>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="grid grid-cols-1 gap-1">
          {hours.map((h) => {
            const block = blockedHours[h];
            const isPast = h < currentHour;
            const isCurrent = h === currentHour;
            const isEditing = editingHour === h;
            const colorIdx = block ? (block.hour % BLOCK_COLORS.length) : 0;

            return (
              <div key={h} className="flex items-center gap-2 group">
                <span className={`w-12 text-right text-xs font-mono shrink-0 ${isCurrent ? "text-blue-400 font-bold" : isPast ? "text-slate-600" : "text-slate-500"}`}>
                  {String(h).padStart(2, "0")}:00
                </span>
                {isCurrent ? <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" /> : <div className="w-2 shrink-0" />}

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
                      {projects.map((p) => <option key={p.repo} value={p.name}>{p.name}</option>)}
                    </select>
                    <button onClick={() => saveTimeBlock(h)} className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer">Save</button>
                    <button onClick={() => setEditingHour(null)} className="text-slate-500 hover:text-slate-300 text-xs cursor-pointer">Cancel</button>
                  </div>
                ) : block ? (
                  <div className={`flex-1 border rounded px-3 py-2 text-sm flex items-center justify-between ${BLOCK_COLORS[colorIdx]} ${isPast ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-2">
                      <span>{block.task}</span>
                      {block.project && <span className="text-[0.65rem] px-1.5 py-0.5 bg-white/10 rounded-full">{block.project}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingHour(h); setBlockInput(block.task); setBlockProject(block.project || ""); }} className="text-xs text-slate-400 hover:text-white cursor-pointer">Edit</button>
                      <button onClick={() => removeTimeBlock(h)} className="text-xs text-red-400 hover:text-red-300 cursor-pointer">X</button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => { if (!isPast || isCurrent) { setEditingHour(h); setBlockInput(""); setBlockProject(""); } }}
                    className={`flex-1 border border-dashed rounded px-3 py-2 text-sm transition-colors ${isPast ? "border-slate-800/30 text-slate-700 cursor-default" : "border-slate-700/50 text-slate-600 hover:border-blue-500/30 hover:text-slate-400 cursor-pointer"}`}
                  >
                    {isPast && !isCurrent ? "—" : "Click to plan this hour"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
