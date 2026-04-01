import type { Post } from "../types/post.ts";

const DRAFTS_KEY = "babylonsocial:drafts";

interface DraftsEnvelope {
  importedAt: string;
  posts: Post[];
}

export function saveDrafts(posts: Post[]): void {
  const envelope: DraftsEnvelope = {
    importedAt: new Date().toISOString(),
    posts,
  };
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(envelope));
}

export function loadDrafts(): Post[] {
  const raw = localStorage.getItem(DRAFTS_KEY);
  if (!raw) return [];
  try {
    const envelope = JSON.parse(raw) as DraftsEnvelope;
    return envelope.posts ?? [];
  } catch {
    return [];
  }
}

export function clearDrafts(): void {
  localStorage.removeItem(DRAFTS_KEY);
}

export function removeDraft(postId: string): void {
  const drafts = loadDrafts().filter((p) => p.id !== postId);
  saveDrafts(drafts);
}

export function updateDraft(post: Post): void {
  const drafts = loadDrafts().map((p) => (p.id === post.id ? post : p));
  saveDrafts(drafts);
}

export function removeDrafts(ids: string[]): void {
  const idSet = new Set(ids);
  const drafts = loadDrafts().filter((p) => !idSet.has(p.id));
  saveDrafts(drafts);
}
