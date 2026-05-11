"use client";

import { useEffect, useState } from "react";

type Connection = { name: string; status: string };
type ConnectionData = { mcp: Connection[]; plugins: Connection[]; tools: Connection[] };

function StatusDot({ status }: { status: string }) {
  if (status === "connected") return <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />;
  if (status === "disabled") return <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />;
  return <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />;
}

function StatusLabel({ status }: { status: string }) {
  if (status === "connected") return <span className="text-[0.65rem] px-2 py-0.5 bg-green-500/15 text-green-400 rounded-full">Connected</span>;
  if (status === "disabled") return <span className="text-[0.65rem] px-2 py-0.5 bg-yellow-500/15 text-yellow-400 rounded-full">Disabled</span>;
  return <span className="text-[0.65rem] px-2 py-0.5 bg-red-500/15 text-red-400 rounded-full">Disconnected</span>;
}

export default function ConnectionsPage() {
  const [conns, setConns] = useState<ConnectionData | null>(null);

  useEffect(() => {
    fetch("/api/data").then((r) => r.json()).then((d) => setConns(d.connections));
  }, []);

  if (!conns) return <div className="flex-1 flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;

  const allConns = [...conns.mcp, ...conns.plugins, ...conns.tools];
  const connected = allConns.filter((c) => c.status === "connected").length;
  const disconnected = allConns.filter((c) => c.status === "disconnected").length;
  const disabled = allConns.filter((c) => c.status === "disabled").length;

  const sections = [
    { title: "MCP Connectors", items: conns.mcp, accent: "blue" },
    { title: "Claude Code Plugins", items: conns.plugins, accent: "purple" },
    { title: "Tools & Apps", items: conns.tools, accent: "emerald" },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Connections</h2>
          <p className="text-slate-400 text-sm mt-1">MCP servers, plugins, and local tools</p>
        </div>
        <div className="flex gap-4 text-sm text-slate-400">
          <span><span className="text-green-400 font-bold text-lg">{connected}</span> connected</span>
          <span><span className="text-red-400 font-bold text-lg">{disconnected}</span> disconnected</span>
          {disabled > 0 && <span><span className="text-yellow-400 font-bold text-lg">{disabled}</span> disabled</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-extrabold text-blue-400">{conns.mcp.length}</div>
          <div className="text-xs text-slate-500 mt-1">MCP Servers</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-extrabold text-purple-400">{conns.plugins.length}</div>
          <div className="text-xs text-slate-500 mt-1">Plugins</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-extrabold text-emerald-400">{conns.tools.length}</div>
          <div className="text-xs text-slate-500 mt-1">Tools</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-extrabold text-green-400">{Math.round((connected / allConns.length) * 100)}%</div>
          <div className="text-xs text-slate-500 mt-1">Online</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {sections.map((section) => {
          const sectionConnected = section.items.filter((c) => c.status === "connected").length;
          return (
            <div key={section.title} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-slate-300">{section.title}</h4>
                <span className="text-xs text-slate-500">{sectionConnected}/{section.items.length}</span>
              </div>
              <div className="space-y-2">
                {section.items.map((c) => (
                  <div key={c.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/40 hover:bg-slate-800/70 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <StatusDot status={c.status} />
                      <span className="text-sm text-slate-200">{c.name}</span>
                    </div>
                    <StatusLabel status={c.status} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
