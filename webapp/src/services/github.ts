import type { Post } from "../types/post.ts";

export const REPO_OWNER =
  import.meta.env.VITE_REPO_OWNER || "PirateJC";
export const REPO_NAME =
  import.meta.env.VITE_REPO_NAME || "babylonAISocialHelper";

const API = "https://api.github.com";

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
  };
}

function headersJson(token: string) {
  return {
    ...headers(token),
    "Content-Type": "application/json",
  };
}

/* ── utf-8 safe base64 encoding ────────────────────────── */

export function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const binString = Array.from(bytes, (byte) =>
    String.fromCodePoint(byte),
  ).join("");
  return btoa(binString);
}

/* ── commit / delete helpers ────────────────────────────── */

export async function commitFileToRepo(
  token: string,
  path: string,
  base64Content: string,
  message: string,
): Promise<void> {
  // Try to get existing file SHA for update (not required for create)
  let sha: string | undefined;
  try {
    const getRes = await fetch(
      `${API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
      { headers: headers(token) },
    );
    if (getRes.ok) {
      const data = (await getRes.json()) as { sha: string };
      sha = data.sha;
    }
  } catch {
    // file doesn't exist yet — that's fine
  }

  const body: Record<string, string> = { message, content: base64Content };
  if (sha) body.sha = sha;

  const res = await fetch(
    `${API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
    { method: "PUT", headers: headersJson(token), body: JSON.stringify(body) },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub commit failed (${res.status}): ${err}`);
  }
}

export async function deleteRepoFile(
  token: string,
  path: string,
  message: string,
): Promise<void> {
  // Get file SHA
  const getRes = await fetch(
    `${API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
    { headers: headers(token) },
  );

  if (getRes.status === 404) return; // already deleted

  if (!getRes.ok) throw new Error(`GitHub API error: ${getRes.status}`);

  const data = (await getRes.json()) as { sha: string };

  const res = await fetch(
    `${API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
    {
      method: "DELETE",
      headers: headersJson(token),
      body: JSON.stringify({ message, sha: data.sha }),
    },
  );

  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`GitHub delete failed (${res.status}): ${err}`);
  }
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
