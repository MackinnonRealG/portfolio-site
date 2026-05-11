import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

function run(cmd: string): string {
  try {
    return execSync(cmd, { timeout: 10000, encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

type RepoCache = {
  repos: {
    name: string;
    description: string;
    isPrivate: boolean;
    updatedAt: string;
    primaryLanguage: string;
    languages: string[];
    commits: number;
    sizeKB: number;
    sizeFormatted: string;
    codeSize: string;
    totalCodeBytes: number;
  }[];
  generated: string;
};

const DISPLAY_NAMES: Record<string, string> = {
  CORTEX_AGI: "CORTEX AGI",
  Trump_Tracker_OG: "Trump Tracker",
  AI_Junkie_Updates: "AI Junkie Updates",
  MatchWise_OG: "MatchWise",
  Pluming_AI_Front_Office: "Plumbing AI Front Office",
  GPT_Twitter_Monitor_Sub_Agent_All_Voting_Members: "FOMC Twitter Monitor",
  "portfolio-site": "Homebase Dashboard",
  "USD-JPY_MultiAgent_Trading_Systeam_OG": "USD/JPY Trading System",
  TABLETAL_AI: "TABLETAL AI",
};

function getRepoData() {
  const cachePath = join(__dirname, "repo-cache.json");
  const altPath = join(process.cwd(), "app/api/data/repo-cache.json");
  const path = existsSync(cachePath) ? cachePath : altPath;
  if (!existsSync(path)) return [];
  const data: RepoCache = JSON.parse(readFileSync(path, "utf-8"));
  return data.repos;
}

function getClaudeStats() {
  const statsPath = `${homedir()}/.claude/stats-cache.json`;
  if (!existsSync(statsPath)) return null;
  const stats = JSON.parse(readFileSync(statsPath, "utf-8"));

  const cleaned: Record<string, unknown> = {};
  for (const [model, usage] of Object.entries(stats.modelUsage || {})) {
    if (model !== "<synthetic>" && model !== "unknown") {
      cleaned[model] = usage;
    }
  }
  stats.modelUsage = cleaned;

  const cleanedDaily = (stats.dailyModelTokens || []).map(
    (d: { date: string; tokensByModel: Record<string, number> }) => {
      const tokens: Record<string, number> = {};
      for (const [m, v] of Object.entries(d.tokensByModel)) {
        if (m !== "<synthetic>" && m !== "unknown") tokens[m] = v;
      }
      return { date: d.date, tokensByModel: tokens };
    }
  );
  stats.dailyModelTokens = cleanedDaily;

  return stats;
}

function getCalendarCache() {
  const cachePath = `${homedir()}/.claude/calendar-cache.json`;
  if (!existsSync(cachePath)) return [];
  try {
    return JSON.parse(readFileSync(cachePath, "utf-8"));
  } catch {
    return [];
  }
}

function getPlanUsage() {
  const cachePath = join(process.cwd(), "app/api/data/plan-usage.json");
  if (!existsSync(cachePath)) return null;
  try {
    return JSON.parse(readFileSync(cachePath, "utf-8"));
  } catch {
    return null;
  }
}

function getToolVersions() {
  return {
    git: run("git --version").replace("git version ", "").split(" ")[0],
    node: run("node --version").replace("v", ""),
    python: run("python3 --version").replace("Python ", ""),
    docker: run("docker --version 2>/dev/null") ? true : false,
    obsidian: existsSync(join(homedir(), "Documents", "Obsidian Vault", ".obsidian")),
    telegram: !!run("python3 -c \"import telegram; print(telegram.__version__)\" 2>/dev/null"),
    gh: !!run("gh auth status 2>&1"),
  };
}

function getPlugins() {
  const settingsPath = join(homedir(), ".claude", "settings.json");
  if (!existsSync(settingsPath)) return [];
  try {
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    const enabled = settings.enabledPlugins || {};
    const PLUGIN_NAMES: Record<string, string> = {
      "code-simplifier@claude-plugins-official": "Code Simplifier",
      "frontend-design@claude-plugins-official": "Frontend Design",
      "commit-commands@claude-plugins-official": "Commit Commands",
      "figma@claude-plugins-official": "Figma Plugin",
      "adspirer-ads-agent@claude-plugins-official": "Adspirer Ads Agent",
      "claude-code-setup@claude-plugins-official": "Claude Code Setup",
      "github@claude-plugins-official": "GitHub Plugin",
    };
    return Object.entries(PLUGIN_NAMES).map(([key, name]) => ({
      name,
      status: enabled[key] === true ? "connected" : enabled[key] === false ? "disabled" : "disconnected",
    }));
  } catch {
    return [];
  }
}

function getMcpConnections() {
  const connCachePath = join(process.cwd(), "app/api/data/mcp-connections.json");
  if (existsSync(connCachePath)) {
    try {
      return JSON.parse(readFileSync(connCachePath, "utf-8"));
    } catch { /* fall through */ }
  }
  return null;
}

export async function GET() {
  const repos = getRepoData();
  const claudeStats = getClaudeStats();
  const calendarEvents = getCalendarCache();
  const tools = getToolVersions();

  const projects = repos.map((r) => ({
    name: DISPLAY_NAMES[r.name] || r.name,
    repo: r.name,
    description: r.description,
    languages: r.languages,
    isPrivate: r.isPrivate,
    commits: r.commits,
    sizeFormatted: r.sizeFormatted,
    codeSize: r.codeSize,
    lastUpdated: r.updatedAt,
    totalCodeBytes: r.totalCodeBytes,
  }));

  const sortOrder = ["CORTEX_AGI", "MatchWise_OG", "AI_Junkie_Updates", "Trump_Tracker_OG", "Pluming_AI_Front_Office", "GPT_Twitter_Monitor_Sub_Agent_All_Voting_Members", "portfolio-site", "USD-JPY_MultiAgent_Trading_Systeam_OG", "TABLETAL_AI"];
  projects.sort((a, b) => {
    const ai = sortOrder.indexOf(a.repo);
    const bi = sortOrder.indexOf(b.repo);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const mcpCache = getMcpConnections();
  const plugins = getPlugins();

  const connections = {
    mcp: mcpCache || [
      { name: "Slack", status: "connected" },
      { name: "Notion", status: "connected" },
      { name: "Figma (MCP)", status: "connected" },
      { name: "Airtable", status: "connected" },
      { name: "Google Calendar", status: "connected" },
      { name: "Google Drive", status: "connected" },
      { name: "Chrome Browser", status: "connected" },
    ],
    plugins: plugins.length > 0 ? plugins : [
      { name: "Code Simplifier", status: "connected" },
      { name: "Frontend Design", status: "connected" },
      { name: "Commit Commands", status: "connected" },
      { name: "Figma Plugin", status: "connected" },
      { name: "Adspirer Ads Agent", status: "connected" },
      { name: "Claude Code Setup", status: "connected" },
      { name: "GitHub Plugin", status: "disabled" },
    ],
    tools: [
      { name: "GitHub (MackinnonRealG)", status: tools.gh ? "connected" : "disconnected" },
      { name: "Claude Code (Opus 4.6)", status: "connected" },
      { name: "Obsidian Vault", status: tools.obsidian ? "connected" : "disconnected" },
      { name: `Git v${tools.git}`, status: tools.git ? "connected" : "disconnected" },
      { name: `Node.js v${tools.node}`, status: tools.node ? "connected" : "disconnected" },
      { name: `Python ${tools.python}`, status: tools.python ? "connected" : "disconnected" },
      { name: "Docker", status: tools.docker ? "connected" : "disconnected" },
      { name: "Telegram Bot", status: tools.telegram ? "connected" : "disconnected" },
    ],
  };

  const planUsage = getPlanUsage();

  const now = new Date();

  return NextResponse.json({
    user: {
      name: "Connor Roy McKinnon Sandford",
      email: "connorsandford747@gmail.com",
      github: "MackinnonRealG",
    },
    projects,
    connections,
    claudeStats,
    planUsage,
    calendarEvents,
    timestamp: now.toISOString(),
    date: now.toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  });
}
