import fs from "node:fs";
import { Scraper } from "agent-twitter-client";
import type { PostData, PlatformResult } from "./utils/types.js";
import { retryWithBackoff, assembleFullText } from "./utils/retry.js";

/**
 * Post to X/Twitter with image attachment.
 * Returns a PlatformResult indicating success or failure.
 */
export async function postToX(
  post: PostData,
  imagePath: string,
): Promise<PlatformResult> {
  const username = process.env.X_USERNAME;
  const password = process.env.X_PASSWORD;
  const email = process.env.X_EMAIL;

  if (!username || !password || !email) {
    const missing = [
      !username && "X_USERNAME",
      !password && "X_PASSWORD",
      !email && "X_EMAIL",
    ].filter(Boolean);
    console.log(`[X/Twitter] ❌ Failed: Missing env vars: ${missing.join(", ")}`);
    return {
      platform: "x",
      success: false,
      error: `Missing env vars: ${missing.join(", ")}`,
      retryCount: 0,
    };
  }

  const { result, error, retryCount } = await retryWithBackoff(
    async () => {
      // Authenticate
      console.log(`[X/Twitter] Authenticating as @${username}...`);
      const scraper = new Scraper();
      await scraper.login(username, password, email);

      // Read image from disk
      const imageBuffer = fs.readFileSync(imagePath);

      // Assemble text with hashtags
      const text = assembleFullText(post, "x");

      // Create tweet with media attachment
      console.log("[X/Twitter] Uploading image...");
      console.log("[X/Twitter] Creating tweet...");
      const response = await scraper.sendTweet(text, undefined, [
        {
          data: imageBuffer,
          mediaType: "image/png",
        },
      ]);

      // Extract tweet ID from response
      const body = await response.json();
      const tweetId: string | undefined =
        body?.data?.create_tweet?.tweet_results?.result?.rest_id;

      if (!tweetId) {
        throw new Error(
          `No tweet ID in response: ${JSON.stringify(body).slice(0, 300)}`,
        );
      }

      return tweetId;
    },
    {
      maxRetries: 3,
      onRetry: (attempt, err) => {
        console.log(
          `[X/Twitter] Retry ${attempt}/3 after error: ${err.message}`,
        );
      },
    },
  );

  if (result) {
    console.log(`[X/Twitter] ✅ Tweeted: ${result}`);
    return {
      platform: "x",
      success: true,
      postId: result,
      retryCount,
    };
  }

  const errorMsg = error?.message ?? "Unknown error";
  console.log(`[X/Twitter] ❌ Failed: ${errorMsg}`);
  return {
    platform: "x",
    success: false,
    error: errorMsg,
    retryCount,
  };
}
