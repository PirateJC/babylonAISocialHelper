import type { PostData } from "./types.js";

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export interface RetryResult<T> {
  result?: T;
  error?: Error;
  retryCount: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generic retry with exponential backoff.
 * 1 initial attempt + up to maxRetries retries.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    baseDelayMs = 30_000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return { result, retryCount: attempt };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxRetries) {
        const waitMs = baseDelayMs * backoffMultiplier ** attempt;
        onRetry?.(attempt + 1, lastError);
        await delay(waitMs);
      }
    }
  }

  return { error: lastError, retryCount: maxRetries };
}

/**
 * Build platform-specific post text.
 * Bluesky omits hashtags; X and LinkedIn include them.
 */
export function assembleFullText(
  post: PostData,
  platform: "x" | "linkedin" | "bluesky",
): string {
  const parts: string[] = [post.text, post.link.url];

  if (platform !== "bluesky") {
    const allTags = [...post.hashtags, ...post.conditionalHashtags];
    if (allTags.length > 0) {
      parts.push(allTags.join(" "));
    }
  }

  return parts.join("\n\n");
}
