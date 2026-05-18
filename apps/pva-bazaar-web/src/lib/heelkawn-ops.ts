export interface HeelKawnOpsSignal {
  releaseTag: string;
  releaseDate: string;
  releaseUrl: string;
  commitDate: string;
  commitMessage: string;
  commitUrl: string;
}

interface GitHubRelease {
  tag_name?: string;
  published_at?: string;
  html_url?: string;
}

interface GitHubCommit {
  html_url?: string;
  commit?: {
    committer?: {
      date?: string;
    };
    message?: string;
  };
}

export async function getLiveRepoSignal(repoUrl: string): Promise<HeelKawnOpsSignal> {
  try {
    const repoPath = new URL(repoUrl).pathname.replace(/^\/+/, "");
    const [owner, repo] = repoPath.split("/");
    if (!owner || !repo) {
      throw new Error("invalid repo path");
    }
    const [releaseRes, commitsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
        next: { revalidate: 300 },
        headers: { Accept: "application/vnd.github+json" },
      }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`, {
        next: { revalidate: 300 },
        headers: { Accept: "application/vnd.github+json" },
      }),
    ]);
    const releaseJson: GitHubRelease = releaseRes.ok ? await releaseRes.json() : {};
    const commitsJson: GitHubCommit[] = commitsRes.ok ? await commitsRes.json() : [];
    const latestCommit: GitHubCommit = commitsJson[0] || {};
    return {
      releaseTag: releaseJson.tag_name || "No tagged release yet",
      releaseDate: releaseJson.published_at
        ? new Date(releaseJson.published_at).toLocaleString("en-US")
        : "Unpublished",
      releaseUrl: releaseJson.html_url || `${repoUrl}/releases`,
      commitDate: latestCommit.commit?.committer?.date
        ? new Date(latestCommit.commit.committer.date).toLocaleString("en-US")
        : "Unknown",
      commitMessage: (latestCommit.commit?.message || "No commit data").split("\n")[0],
      commitUrl: latestCommit.html_url || `${repoUrl}/commits`,
    };
  } catch {
    return {
      releaseTag: "Unavailable",
      releaseDate: "Unavailable",
      releaseUrl: `${repoUrl}/releases`,
      commitDate: "Unavailable",
      commitMessage: "Unable to load commit telemetry",
      commitUrl: `${repoUrl}/commits`,
    };
  }
}

