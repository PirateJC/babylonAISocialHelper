import type { Post } from "../types/post.ts";

export const REPO_OWNER =
  import.meta.env.VITE_REPO_OWNER || "BabylonJS";
export const REPO_NAME =
  import.meta.env.VITE_REPO_NAME || "babylonAISocialHelper";

const API = "https://api.github.com";

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
  };
}

export async function fetchDirectoryListing(
  token: string,
  owner: string,
  repo: string,
  path: string,
): Promise<{ name: string }[]> {
  const res = await fetch(
    `${API}/repos/${owner}/${repo}/contents/${path}`,
    { headers: headers(token) },
  );

  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  const data = (await res.json()) as { name: string }[];
  return Array.isArray(data) ? data : [];
}

export async function listScheduledDates(token: string): Promise<string[]> {
  const files = await fetchDirectoryListing(
    token,
    REPO_OWNER,
    REPO_NAME,
    "scheduled",
  );

  return files
    .map((f) => f.name)
    .filter((n) => /^\d{4}-\d{2}-\d{2}\.json$/.test(n))
    .map((n) => n.replace(".json", ""))
    .sort();
}

async function fetchFileContent(
  token: string,
  path: string,
): Promise<string> {
  const res = await fetch(
    `${API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
    { headers: headers(token) },
  );

  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  const data = (await res.json()) as { content: string; encoding: string };
  if (data.encoding === "base64") {
    return atob(data.content.replace(/\n/g, ""));
  }
  return data.content;
}

export async function fetchScheduledPosts(
  token: string,
): Promise<Post[]> {
  const files = await fetchDirectoryListing(
    token,
    REPO_OWNER,
    REPO_NAME,
    "scheduled",
  );

  const jsonFiles = files.filter((f) =>
    /^\d{4}-\d{2}-\d{2}\.json$/.test(f.name),
  );

  const posts: Post[] = [];
  for (const file of jsonFiles) {
    try {
      const content = await fetchFileContent(token, `scheduled/${file.name}`);
      const post = JSON.parse(content) as Post;
      post.status = "scheduled";
      post.assignedDate = file.name.replace(".json", "");
      posts.push(post);
    } catch {
      // skip files that can't be parsed
    }
  }
  return posts;
}

export async function fetchFailedPosts(
  token: string,
): Promise<Post[]> {
  const files = await fetchDirectoryListing(
    token,
    REPO_OWNER,
    REPO_NAME,
    "failed",
  );

  const jsonFiles = files.filter((f) => f.name.endsWith(".json"));

  const posts: Post[] = [];
  for (const file of jsonFiles) {
    try {
      const content = await fetchFileContent(token, `failed/${file.name}`);
      const post = JSON.parse(content) as Post;
      post.status = "failed";
      posts.push(post);
    } catch {
      // skip files that can't be parsed
    }
  }
  return posts;
}
