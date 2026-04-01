import type { Post } from "../types/post.ts";
import { countPostGraphemes } from "../utils/grapheme-count.ts";
import { commitFileToRepo, deleteRepoFile, utf8ToBase64, listScheduledDates } from "./github.ts";

const GRAPHEME_LIMIT = 300;

/* ── single post approval ────────────────────────────────── */

export async function approveSinglePost(
  token: string,
  post: Post,
): Promise<void> {
  // 1. Validate grapheme count
  const count = countPostGraphemes(post.text, post.link?.url ?? "");
  if (count > GRAPHEME_LIMIT) {
    throw new Error(
      `Post exceeds ${GRAPHEME_LIMIT}-grapheme limit (current: ${count}). Shorten the text or link.`,
    );
  }

  // 2. Check image data
  const imageData = post.localImageData;
  if (!imageData) {
    throw new Error(
      "No image data available. Please upload a screenshot before approving.",
    );
  }

  // 3. Build clean post JSON (remove UI-only fields)
  const cleanPost = {
    id: post.id,
    assignedDate: post.assignedDate,
    category: post.category,
    text: post.text,
    hashtags: post.hashtags,
    conditionalHashtags: post.conditionalHashtags,
    link: post.link,
    media: post.media,
    metadata: post.metadata,
  };
  const postJson = JSON.stringify(cleanPost, null, 2);

  // 4. Commit screenshot image
  const rawBase64 = imageData.replace(/^data:image\/\w+;base64,/, "");
  await commitFileToRepo(
    token,
    post.media.filePath,
    rawBase64,
    `chore: add screenshot for ${post.id}`,
  );

  // 5. Commit post JSON
  await commitFileToRepo(
    token,
    `scheduled/${post.assignedDate}.json`,
    utf8ToBase64(postJson),
    `chore: schedule post ${post.id} for ${post.assignedDate}`,
  );
}

/* ── delete helpers ──────────────────────────────────────── */

export async function deleteScheduledPost(
  token: string,
  post: Post,
): Promise<void> {
  await deleteRepoFile(
    token,
    `scheduled/${post.assignedDate}.json`,
    `chore: delete scheduled post ${post.id}`,
  );
  await deleteRepoFile(
    token,
    post.media.filePath,
    `chore: delete media for ${post.id}`,
  );
}

export async function deleteFailedPost(
  token: string,
  post: Post,
): Promise<void> {
  await deleteRepoFile(
    token,
    `failed/${post.assignedDate}.json`,
    `chore: delete failed post ${post.id}`,
  );
  await deleteRepoFile(
    token,
    post.media.filePath,
    `chore: delete media for ${post.id}`,
  );
}

/* ── retry failed post ────────────────────────────────────── */

function nextAvailableDate(occupiedDates: Set<string>): string {
  const d = new Date();
  d.setDate(d.getDate() + 1); // start from tomorrow
  for (let i = 0; i < 365; i++) {
    const iso = d.toISOString().slice(0, 10);
    if (!occupiedDates.has(iso)) return iso;
    d.setDate(d.getDate() + 1);
  }
  // fallback: use tomorrow even if occupied
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 1);
  return fallback.toISOString().slice(0, 10);
}

export async function retryFailedPost(
  token: string,
  post: Post,
): Promise<string> {
  // 1. Determine target date
  const scheduledDates = await listScheduledDates(token);
  const occupied = new Set(scheduledDates);

  const today = new Date().toISOString().slice(0, 10);
  let targetDate: string;
  if (post.assignedDate >= today && !occupied.has(post.assignedDate)) {
    targetDate = post.assignedDate;
  } else {
    targetDate = nextAvailableDate(occupied);
  }

  // 2. Build clean post JSON without platformResults
  const cleanPost: Record<string, unknown> = {
    id: post.id,
    assignedDate: targetDate,
    category: post.category,
    text: post.text,
    hashtags: post.hashtags,
    conditionalHashtags: post.conditionalHashtags,
    link: post.link,
    media: post.media,
    metadata: post.metadata,
  };
  const postJson = JSON.stringify(cleanPost, null, 2);

  // 3. Commit to scheduled/
  await commitFileToRepo(
    token,
    `scheduled/${targetDate}.json`,
    utf8ToBase64(postJson),
    `chore: retry post ${post.id} — reschedule for ${targetDate}`,
  );

  // 4. Delete from failed/
  await deleteRepoFile(
    token,
    `failed/${post.assignedDate}.json`,
    `chore: remove failed post ${post.id} after retry`,
  );

  return targetDate;
}

/* ── batch approval ──────────────────────────────────────── */

export interface BatchResult {
  completedCount: number;
  failedPostId?: string;
  error?: string;
}

export async function batchApprove(
  token: string,
  posts: Post[],
  onProgress: (current: number, total: number) => void,
): Promise<BatchResult> {
  for (let i = 0; i < posts.length; i++) {
    onProgress(i + 1, posts.length);
    try {
      await approveSinglePost(token, posts[i]);
    } catch (err) {
      return {
        completedCount: i,
        failedPostId: posts[i].id,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
  return { completedCount: posts.length };
}
