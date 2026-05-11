import { NextResponse } from "next/server";
import { readFileSync, existsSync, readdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

type SkillEntry = {
  name: string;
  slug: string;
  description: string;
  source: string;
  category: string;
};

function readSkillMd(path: string): { name: string; description: string } | null {
  if (!existsSync(path)) return null;
  try {
    const content = readFileSync(path, "utf-8");
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    const descMatch = content.match(/^description:\s*["']?(.+?)["']?\s*$/m);
    if (nameMatch && descMatch) {
      return { name: nameMatch[1].trim(), description: descMatch[1].trim() };
    }
    return null;
  } catch {
    return null;
  }
}

function scanPluginSkills(): SkillEntry[] {
  const skills: SkillEntry[] = [];
  const cachePath = join(homedir(), ".claude", "plugins", "cache", "claude-plugins-official");
  if (!existsSync(cachePath)) return skills;

  const settingsPath = join(homedir(), ".claude", "settings.json");
  const enabledPlugins: Record<string, boolean> = {};
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
      Object.assign(enabledPlugins, settings.enabledPlugins || {});
    } catch { /* ignore */ }
  }

  const PLUGIN_CATEGORIES: Record<string, string> = {
    "figma": "Figma & Design",
    "claude-code-setup": "Code & Setup",
    "frontend-design": "Frontend",
    "code-simplifier": "Code & Setup",
    "commit-commands": "Code & Setup",
    "adspirer-ads-agent": "Marketing",
  };

  const pluginDirs = readdirSync(cachePath, { withFileTypes: true }).filter((d) => d.isDirectory());

  for (const dir of pluginDirs) {
    const pluginKey = `${dir.name}@claude-plugins-official`;
    if (enabledPlugins[pluginKey] === undefined && !enabledPlugins[pluginKey]) continue;

    const skillsDir = join(cachePath, dir.name);
    const versions = readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory());
    if (versions.length === 0) continue;

    const latestVersion = versions[versions.length - 1].name;
    const skillsPath = join(skillsDir, latestVersion, "skills");
    if (!existsSync(skillsPath)) continue;

    const skillFiles = readdirSync(skillsPath, { withFileTypes: true });
    for (const sf of skillFiles) {
      const filePath = sf.isDirectory()
        ? join(skillsPath, sf.name, "SKILL.md")
        : sf.name.endsWith(".md")
          ? join(skillsPath, sf.name)
          : null;

      if (!filePath || !existsSync(filePath)) continue;

      const parsed = readSkillMd(filePath);
      if (!parsed) continue;

      const existing = skills.find((s) => s.slug === parsed.name);
      if (existing) continue;

      skills.push({
        name: formatSkillName(parsed.name),
        slug: parsed.name,
        description: parsed.description,
        source: dir.name,
        category: PLUGIN_CATEGORIES[dir.name] || "Other",
      });
    }
  }

  return skills;
}

function scanUserSkills(): SkillEntry[] {
  const skills: SkillEntry[] = [];
  const skillsDir = join(homedir(), ".claude", "skills");
  if (!existsSync(skillsDir)) return skills;

  const entries = readdirSync(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

    const skillPath = join(skillsDir, entry.name);
    const mdFiles = ["SKILL.md", "skill.md", `${entry.name}.md`];
    let parsed: { name: string; description: string } | null = null;

    for (const md of mdFiles) {
      parsed = readSkillMd(join(skillPath, md));
      if (parsed) break;
    }

    if (!parsed) {
      const allMd = existsSync(skillPath) && readdirSync(skillPath).filter((f) => f.endsWith(".md"));
      if (allMd && allMd.length > 0) {
        parsed = readSkillMd(join(skillPath, allMd[0]));
      }
    }

    if (!parsed) continue;

    const SKILL_CATEGORIES: Record<string, string> = {
      "find-skills": "Skills & Discovery",
      "remotion-best-practices": "Video & Animation",
      "explain-code": "Code & Setup",
    };

    skills.push({
      name: formatSkillName(parsed.name),
      slug: parsed.name,
      description: parsed.description,
      source: "user-installed",
      category: SKILL_CATEGORIES[entry.name] || "Other",
    });
  }

  return skills;
}

function formatSkillName(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bApi\b/g, "API")
    .replace(/\bMcp\b/g, "MCP")
    .replace(/\bUi\b/g, "UI");
}

export async function GET() {
  const pluginSkills = scanPluginSkills();
  const userSkills = scanUserSkills();
  const allSkills = [...userSkills, ...pluginSkills];

  allSkills.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  const categoryMap: Record<string, number> = {};
  for (const s of allSkills) {
    categoryMap[s.category] = (categoryMap[s.category] || 0) + 1;
  }

  const categories = Object.entries(categoryMap)
    .map(([name, count]) => ({ name, count, color: name }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ categories, skills: allSkills });
}
