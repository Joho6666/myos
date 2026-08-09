import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GitHubUser = {
  login?: string;
  html_url?: string;
  public_repos?: number;
  followers?: number;
  following?: number;
};

type GitHubRepo = {
  name?: string;
  full_name?: string;
  html_url?: string;
  description?: string | null;
  updated_at?: string;
  private?: boolean;
  language?: string | null;
  open_issues_count?: number;
  stargazers_count?: number;
};

type GitHubIssue = {
  title?: string;
  html_url?: string;
  state?: string;
  updated_at?: string;
  repository?: {
    full_name?: string;
  };
};

async function githubFetch<T>(path: string, signal: AbortSignal): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("未配置 GITHUB_TOKEN。");
  }

  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28"
    },
    signal
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof body?.message === "string" ? body.message : `GitHub 返回 ${response.status}`;
    throw new Error(message);
  }
  return body as T;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录 MyOS。" }, { status: 401 });
  }

  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json({ error: "未配置 GITHUB_TOKEN。" }, { status: 503 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const [profile, repositories, issues, starred] = await Promise.all([
      githubFetch<GitHubUser>("/user", controller.signal),
      githubFetch<GitHubRepo[]>("/user/repos?sort=updated&per_page=8", controller.signal),
      githubFetch<GitHubIssue[]>("/issues?filter=assigned&state=open&per_page=8", controller.signal),
      githubFetch<GitHubRepo[]>("/user/starred?per_page=6", controller.signal)
    ]);

    return NextResponse.json({
      profile: {
        login: profile.login || "GitHub",
        htmlUrl: profile.html_url || "",
        publicRepos: profile.public_repos || 0,
        followers: profile.followers || 0,
        following: profile.following || 0
      },
      repositories: repositories.map((repo) => ({
        name: repo.name || repo.full_name || "Untitled",
        fullName: repo.full_name || repo.name || "Untitled",
        htmlUrl: repo.html_url || "",
        description: repo.description || "",
        updatedAt: repo.updated_at || "",
        private: Boolean(repo.private),
        language: repo.language || "Unknown",
        openIssuesCount: repo.open_issues_count || 0,
        stars: repo.stargazers_count || 0
      })),
      issues: issues.map((issue) => ({
        title: issue.title || "Untitled issue",
        htmlUrl: issue.html_url || "",
        repository: issue.repository?.full_name || "Unknown repository",
        updatedAt: issue.updated_at || "",
        state: issue.state || "open"
      })),
      starred: starred.map((repo) => ({
        name: repo.name || repo.full_name || "Untitled",
        fullName: repo.full_name || repo.name || "Untitled",
        htmlUrl: repo.html_url || "",
        description: repo.description || "",
        language: repo.language || "Unknown",
        stars: repo.stargazers_count || 0
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub 总览读取失败。";
    return NextResponse.json({ error: message }, { status: message.includes("未配置") ? 503 : 502 });
  } finally {
    clearTimeout(timer);
  }
}
