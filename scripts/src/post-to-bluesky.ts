import fs from "node:fs";
import { AtpAgent } from "@atproto/api";
import type { PostData, PlatformResult } from "./utils/types.js";
import { retryWithBackoff, assembleFullText } from "./utils/retry.js";

/**
 * Post to Bluesky with image embed and link facet.
 * Returns a PlatformResult indicating success or failure.
 */
export async function postToBluesky(
  post: PostData,
  imagePath: string,
): Promise<PlatformResult> {
  const handle = process.env.BLUESKY_HANDLE;
  const appPassword = process.env.BLUESKY_APP_PASSWORD;

  if (!handle || !appPassword) {
    const missing = [
      !handle && "BLUESKY_HANDLE",
      !appPassword && "BLUESKY_APP_PASSWORD",
    ].filter(Boolean);
    console.log(`[Bluesky] ❌ Failed: Missing env vars: ${missing.join(", ")}`);
    return {
      platform: "bluesky",
      success: false,
      error: `Missing env vars: ${missing.join(", ")}`,
      retryCount: 0,
    };
  }

  const { result, error, retryCount } = await retryWithBackoff(
    async () => {
      // 2a. Create agent and authenticate
      console.log(`[Bluesky] Authenticating as ${handle}...`);
      const agent = new AtpAgent({ service: "https://bsky.social" });
      await agent.login({ identifier: handle, password: appPassword });

      // 2b. Read image from disk
      const imageBuffer = fs.readFileSync(imagePath);

      // 2c. Upload image blob
      console.log("[Bluesky] Uploading image...");
      const uploadResponse = await agent.uploadBlob(imageBuffer, {
        encoding: "image/png",
      });

      // 2d. Assemble text (no hashtags for Bluesky)
      const text = assembleFullText(post, "bluesky");

      // 2e/2f. Build facets for the link URL using UTF-8 byte offsets
      const encoder = new TextEncoder();
      const textBytes = encoder.encode(text);
      const urlBytes = encoder.encode(post.link.url);

      const urlByteStart = findByteOffset(textBytes, urlBytes);
      const urlByteEnd = urlByteStart + urlBytes.byteLength;

      const facets = [
        {
          index: { byteStart: urlByteStart, byteEnd: urlByteEnd },
          features: [
            {
              $type: "app.bsky.richtext.facet#link" as const,
              uri: post.link.url,
            },
          ],
        },
      ];

      // 2e. Create post with image embed and link facet
      console.log("[Bluesky] Creating post...");
      const postResponse = await agent.post({
        text,
        facets,
        embed: {
          $type: "app.bsky.embed.images",
          images: [
            {
              image: uploadResponse.data.blob,
              alt: post.media.description,
            },
          ],
        },
      });

      return postResponse.uri;
    },
    {
      maxRetries: 3,
      onRetry: (attempt, err) => {
        console.log(
          `[Bluesky] Retry ${attempt}/3 after error: ${err.message}`,
        );
      },
    },
  );

  if (result) {
    console.log(`[Bluesky] ✅ Posted: ${result}`);
    return {
      platform: "bluesky",
      success: true,
      postId: result,
      retryCount,
    };
  }

  const errorMsg = error?.message ?? "Unknown error";
  console.log(`[Bluesky] ❌ Failed: ${errorMsg}`);
  return {
    platform: "bluesky",
    success: false,
    error: errorMsg,
    retryCount,
  };
}

/** Find the byte offset of a sub-array within a Uint8Array. */
function findByteOffset(haystack: Uint8Array, needle: Uint8Array): number {
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}
