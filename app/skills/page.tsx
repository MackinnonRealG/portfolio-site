"use client";

import { useEffect, useState } from "react";

type Skill = {
  name: string;
  slug: string;
  description: string;
  source: string;
  category: string;
};

type SkillsData = {
  categories: { name: string; count: number; color: string }[];
  skills: Skill[];
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  "Figma & Design": { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/30", badge: "bg-pink-500/20 text-pink-300" },
  "Code & Setup": { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", badge: "bg-blue-500/20 text-blue-300" },
  "Frontend": { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", badge: "bg-emerald-500/20 text-emerald-300" },
  "Marketing": { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", badge: "bg-orange-500/20 text-orange-300" },
  "Skills & Discovery": { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", badge: "bg-purple-500/20 text-purple-300" },
  "Video & Animation": { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30", badge: "bg-cyan-500/20 text-cyan-300" },
};

export default function SkillsPage() {
  const [data, setData] = useState<SkillsData | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/skills").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <div className="flex-1 flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;

  const filtered = filter === "all" ? data.skills : data.skills.filter((s) => s.category === filter);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Skills</h2>
          <p className="text-slate-400 text-sm mt-1">{data.skills.length} skills installed across {data.categories.length} categories</p>
        </div>
      </div>

      {/* Category stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {data.categories.map((cat) => {
          const colors = CATEGORY_COLORS[cat.name] || { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30", badge: "" };
          return (
            <button
              key={cat.name}
              onClick={() => setFilter(filter === cat.name ? "all" : cat.name)}
              className={`bg-slate-900 border rounded-xl p-4 text-center transition-colors cursor-pointer ${filter === cat.name ? `${colors.border} ${colors.bg}` : "border-slate-800 hover:border-slate-700"}`}
            >
              <div className={`text-2xl font-extrabold ${colors.text}`}>{cat.count}</div>
              <div className="text-[0.65rem] text-slate-500 mt-1 leading-tight">{cat.name}</div>
            </button>
          );
        })}
      </div>

      {/* Skills list */}
      <div className="space-y-3">
        {filtered.map((skill) => {
          const colors = CATEGORY_COLORS[skill.category] || { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30", badge: "bg-slate-500/20 text-slate-300" };
          const isExpanded = expanded === skill.slug;

          return (
            <div
              key={skill.slug}
              onClick={() => setExpanded(isExpanded ? null : skill.slug)}
              className={`bg-slate-900 border rounded-xl p-5 transition-colors cursor-pointer ${isExpanded ? `${colors.border} ${colors.bg}` : "border-slate-800 hover:border-slate-700"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h4 className={`font-bold text-sm ${colors.text}`}>{skill.name}</h4>
                    <span className={`text-[0.6rem] px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>{skill.category}</span>
                  </div>
                  <p className={`text-xs leading-relaxed ${isExpanded ? "text-slate-300" : "text-slate-400 line-clamp-2"}`}>
                    {skill.description}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[0.6rem] px-2 py-0.5 bg-slate-800 text-slate-500 rounded-full">{skill.source}</span>
                  <span className={`text-slate-600 text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}>&#9660;</span>
                </div>
              </div>
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-800/50">
                  <div className="flex items-center gap-4 text-[0.65rem] text-slate-500">
                    <span>Slash command: <span className={`font-mono ${colors.text}`}>/{skill.slug}</span></span>
                    <span>Source: <span className="text-slate-400">{skill.source}</span></span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
